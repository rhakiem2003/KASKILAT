/**
 * @file photo.service.ts
 * @description Penyimpanan foto struk: Google Drive (akun login) atau IndexedDB (tamu/offline).
 * Referensi foto disimpan di transaksi sebagai "drive://<fileId>" atau "local://<photoId>".
 */

import { prepareImage } from '../../../lib/image-source';
import {
  deleteDriveFile,
  fetchDriveFileBlob,
  isDriveConnected,
  uploadFileToDrive,
} from './drive.service';
import { deletePhotoBlob, getPhotoBlob, putPhotoBlob } from './photo-store';

const DRIVE_PREFIX = 'drive://';
const LOCAL_PREFIX = 'local://';

const objectUrlCache = new Map<string, string>();

export interface SavedPhoto {
  ref: string;
  provider: 'drive' | 'local';
  /** Diisi jika Drive terhubung tetapi unggahan gagal dan foto dialihkan ke lokal. */
  warning?: string;
}

export interface SavePhotoOptions {
  transactionId?: string;
}

function isDirectUrl(ref: string): boolean {
  return (
    ref.startsWith('data:') ||
    ref.startsWith('blob:') ||
    ref.startsWith('http://') ||
    ref.startsWith('https://')
  );
}

function buildDriveFileName(transactionId?: string): string {
  if (transactionId) return `${transactionId}.jpg`;

  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  const stamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `struk-${stamp}-${Math.random().toString(36).slice(2, 6)}.jpg`;
}

function cacheObjectUrl(ref: string, blob: Blob): string {
  const existing = objectUrlCache.get(ref);
  if (existing) URL.revokeObjectURL(existing);
  const url = URL.createObjectURL(blob);
  objectUrlCache.set(ref, url);
  return url;
}

/**
 * Menyimpan foto struk. Drive diutamakan (saat login); jika belum login/gagal,
 * foto masuk IndexedDB dan tidak pernah diunduh ke Galeri HP.
 */
export async function saveReceiptPhoto(
  source: string | File,
  options: SavePhotoOptions = {}
): Promise<SavedPhoto> {
  const prepared = await prepareImage(source);

  let warning: string | undefined;

  if (isDriveConnected()) {
    try {
      const file = await uploadFileToDrive(
        prepared.blob,
        buildDriveFileName(options.transactionId)
      );
      putPhotoBlob(`drive:${file.id}`, prepared.blob).catch(() => {
        // Cache lokal opsional
      });
      return { ref: `${DRIVE_PREFIX}${file.id}`, provider: 'drive' };
    } catch (error) {
      warning = error instanceof Error ? error.message : 'Unggahan ke Google Drive gagal.';
      console.warn('[Photo] Upload ke Google Drive gagal, menyimpan lokal:', error);
    }
  }

  const id = `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await putPhotoBlob(id, prepared.blob);
  return { ref: `${LOCAL_PREFIX}${id}`, provider: 'local', warning };
}

/**
 * Mengunggah ulang satu foto yang masih tersimpan lokal ke Drive.
 */
export async function migratePhotoToDrive(
  ref: string,
  transactionId?: string
): Promise<string | null> {
  if (!isDriveConnected() || !ref.startsWith(LOCAL_PREFIX)) return null;

  const blob = await getPhotoBlob(ref.slice(LOCAL_PREFIX.length));
  if (!blob) return null;

  const file = await uploadFileToDrive(blob, buildDriveFileName(transactionId));
  putPhotoBlob(`drive:${file.id}`, blob).catch(() => {
    // Cache lokal opsional
  });
  return `${DRIVE_PREFIX}${file.id}`;
}

/**
 * Mengubah referensi foto menjadi URL yang bisa dipakai <img src>.
 */
export async function resolvePhotoUrl(ref?: string | null): Promise<string | null> {
  if (!ref) return null;

  const cachedUrl = objectUrlCache.get(ref);
  if (cachedUrl) return cachedUrl;

  if (ref.startsWith(DRIVE_PREFIX)) {
    const fileId = ref.slice(DRIVE_PREFIX.length);
    const cachedBlob = await getPhotoBlob(`drive:${fileId}`);
    if (cachedBlob) return cacheObjectUrl(ref, cachedBlob);

    if (!isDriveConnected()) return null;

    const blob = await fetchDriveFileBlob(fileId);
    putPhotoBlob(`drive:${fileId}`, blob).catch(() => {
      // Cache opsional
    });
    return cacheObjectUrl(ref, blob);
  }

  if (ref.startsWith(LOCAL_PREFIX)) {
    const photoId = ref.slice(LOCAL_PREFIX.length);
    const blob = await getPhotoBlob(photoId);
    return blob ? cacheObjectUrl(ref, blob) : null;
  }

  if (isDirectUrl(ref)) return ref;

  return ref;
}

export async function deleteReceiptPhoto(ref?: string | null): Promise<void> {
  if (!ref) return;

  const cachedUrl = objectUrlCache.get(ref);
  if (cachedUrl) {
    URL.revokeObjectURL(cachedUrl);
    objectUrlCache.delete(ref);
  }

  try {
    if (ref.startsWith(DRIVE_PREFIX)) {
      const fileId = ref.slice(DRIVE_PREFIX.length);
      await deletePhotoBlob(`drive:${fileId}`).catch(() => undefined);
      if (isDriveConnected()) {
        await deleteDriveFile(fileId);
      }
      return;
    }

    if (ref.startsWith(LOCAL_PREFIX)) {
      await deletePhotoBlob(ref.slice(LOCAL_PREFIX.length));
    }
  } catch (error) {
    console.warn('[Photo] Gagal menghapus foto:', error);
  }
}

export function isPhotoRef(ref?: string | null): boolean {
  if (!ref) return false;
  return ref.startsWith(DRIVE_PREFIX) || ref.startsWith(LOCAL_PREFIX) || isDirectUrl(ref);
}
