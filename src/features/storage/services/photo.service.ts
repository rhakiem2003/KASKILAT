/**
 * @file photo.service.ts
 * @description Receipt photos are always stored locally in IndexedDB.
 * Legacy Drive references are resolved only from an existing local cache; this app
 * no longer signs in to Google or uploads receipt photos in the background.
 */

import { prepareImage } from '../../../lib/image-source';
import { deletePhotoBlob, getPhotoBlob, putPhotoBlob } from './photo-store';

const DRIVE_PREFIX = 'drive://';
const LOCAL_PREFIX = 'local://';

const objectUrlCache = new Map<string, string>();

export interface SavedPhoto {
  ref: string;
  provider: 'local';
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

function cacheObjectUrl(ref: string, blob: Blob): string {
  const existing = objectUrlCache.get(ref);
  if (existing) URL.revokeObjectURL(existing);
  const url = URL.createObjectURL(blob);
  objectUrlCache.set(ref, url);
  return url;
}

/** Save locally first. The user can later export the data and choose where to store it. */
export async function saveReceiptPhoto(
  source: string | File,
  _options: SavePhotoOptions = {}
): Promise<SavedPhoto> {
  const prepared = await prepareImage(source);
  const id = `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await putPhotoBlob(id, prepared.blob);
  return { ref: `${LOCAL_PREFIX}${id}`, provider: 'local' };
}

export async function resolvePhotoUrl(ref?: string | null): Promise<string | null> {
  if (!ref) return null;

  const cachedUrl = objectUrlCache.get(ref);
  if (cachedUrl) return cachedUrl;

  if (ref.startsWith(DRIVE_PREFIX)) {
    const fileId = ref.slice(DRIVE_PREFIX.length);
    const cachedBlob = await getPhotoBlob(`drive:${fileId}`);
    return cachedBlob ? cacheObjectUrl(ref, cachedBlob) : null;
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
      // Never delete the user's legacy remote file from Drive. Only discard its local cache.
      await deletePhotoBlob(`drive:${ref.slice(DRIVE_PREFIX.length)}`);
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
  return (
    ref.startsWith(DRIVE_PREFIX) ||
    ref.startsWith(LOCAL_PREFIX) ||
    isDirectUrl(ref)
  );
}
