/**
 * @file backup.service.ts
 * @description Portable KasKilat backups. The user chooses where to store the exported file.
 */

import {
  getSnapshot,
  mergeWithCurrentDatabase,
  normalizeImportedDatabase,
  restoreDatabase,
} from '../../database/services/database-store';
import { getPhotoBlob, putPhotoBlob } from './photo-store';

const BACKUP_FORMAT = 'kaskilat-backup';
const BACKUP_VERSION = 1;
const MAX_RESTORE_SIZE = 150 * 1024 * 1024;

interface BackupPhoto {
  id: string;
  mimeType: string;
  data: string;
}

interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  database: unknown;
  photos: BackupPhoto[];
}

export interface BackupExportResult {
  blob: Blob;
  fileName: string;
  transactionCount: number;
  photoCount: number;
  missingPhotoCount: number;
}

export interface BackupRestoreResult {
  transactionCount: number;
  photoCount: number;
  merged: boolean;
}

function toBase64(blob: Blob): Promise<string> {
  return blob.arrayBuffer().then((buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
    }
    return btoa(binary);
  });
}

function fromBase64(value: string, mimeType: string): Blob {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType || 'application/octet-stream' });
}

function photoStorageId(reference: string): string | null {
  if (reference.startsWith('local://')) return reference.slice('local://'.length);
  if (reference.startsWith('drive://')) return `drive:${reference.slice('drive://'.length)}`;
  return null;
}

export async function createBackupFile(): Promise<BackupExportResult> {
  const database = getSnapshot().database;
  if (!database) throw new Error('Belum ada data yang bisa dicadangkan.');

  const photos: BackupPhoto[] = [];
  const seen = new Set<string>();
  let missingPhotoCount = 0;

  for (const transaction of database.transactions) {
    const reference = transaction.photo_url;
    if (!reference) continue;
    const storageId = photoStorageId(reference);
    if (!storageId || seen.has(storageId)) continue;
    seen.add(storageId);

    const photo = await getPhotoBlob(storageId);
    if (!photo) {
      missingPhotoCount += 1;
      continue;
    }

    photos.push({
      id: storageId,
      mimeType: photo.type || 'image/jpeg',
      data: await toBase64(photo),
    });
  }

  const payload: BackupFile = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    database,
    photos,
  };

  const date = new Date();
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('');
  return {
    blob: new Blob([JSON.stringify(payload)], { type: 'application/json' }),
    fileName: `kaskilat-backup-${stamp}.kaskilat`,
    transactionCount: database.transactions.length,
    photoCount: photos.length,
    missingPhotoCount,
  };
}

/**
 * Supports both new .kaskilat packages and the previous plain database JSON file.
 * Imported records are merged by stable IDs; records not present in the backup remain.
 */
export async function restoreBackupFile(file: File): Promise<BackupRestoreResult> {
  if (file.size > MAX_RESTORE_SIZE) {
    throw new Error('File backup terlalu besar. Batas pemulihan adalah 150 MB.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error('File tidak bisa dibaca sebagai JSON backup KasKilat.');
  }

  let rawDatabase: unknown = parsed;
  let photos: BackupPhoto[] = [];

  if (parsed && typeof parsed === 'object' && 'format' in parsed) {
    const packageData = parsed as Partial<BackupFile>;
    if (packageData.format !== BACKUP_FORMAT || packageData.version !== BACKUP_VERSION) {
      throw new Error('Versi atau format backup tidak didukung.');
    }
    rawDatabase = packageData.database;
    photos = Array.isArray(packageData.photos) ? packageData.photos : [];
  }

  const imported = normalizeImportedDatabase(rawDatabase);
  if (!imported) {
    throw new Error('Struktur file tidak dikenali sebagai database KasKilat.');
  }

  let restoredPhotos = 0;
  for (const photo of photos) {
    if (
      !photo ||
      typeof photo.id !== 'string' ||
      typeof photo.data !== 'string' ||
      typeof photo.mimeType !== 'string'
    ) {
      continue;
    }
    try {
      await putPhotoBlob(photo.id, fromBase64(photo.data, photo.mimeType));
      restoredPhotos += 1;
    } catch (error) {
      console.warn('[Backup] Foto tidak dapat dipulihkan:', error);
    }
  }

  const merged = mergeWithCurrentDatabase(imported);
  await restoreDatabase(merged);
  return {
    transactionCount: imported.transactions.length,
    photoCount: restoredPhotos,
    merged: Boolean(getSnapshot().database),
  };
}
