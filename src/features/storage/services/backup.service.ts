/**
 * @file backup.service.ts
 * @description Portable KasKilat backups. The user chooses where to store the exported file.
 */

import {
  getSnapshot,
  normalizeImportedDatabase,
  restoreDatabase,
} from '../../database/services/database-store';
import { getPhotoBlob, putPhotoBlob } from './photo-store';

const BACKUP_FORMAT = 'kaskilat-backup';
const BACKUP_VERSION = 1;
const MAX_BACKUP_SIZE = 150 * 1024 * 1024;

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
  if (!value || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
    throw new Error('Data foto di dalam backup tidak valid.');
  }
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType || 'application/octet-stream' });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
  const serialized = JSON.stringify(payload);
  const blob = new Blob([serialized], { type: 'application/json' });
  if (blob.size > MAX_BACKUP_SIZE) {
    throw new Error(
      'File cadangan melebihi batas 150 MB. Hapus beberapa foto struk lama atau buat beberapa cadangan terpisah.'
    );
  }

  const date = new Date();
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('');

  return {
    blob,
    fileName: `kaskilat-backup-${stamp}.kaskilat`,
    transactionCount: database.transactions.length,
    photoCount: photos.length,
    missingPhotoCount,
  };
}

/**
 * Supports .kaskilat packages and previous plain JSON database exports.
 * Imported records are merged by stable IDs; current device records are retained.
 */
export async function restoreBackupFile(file: File): Promise<BackupRestoreResult> {
  if (file.size > MAX_BACKUP_SIZE) {
    throw new Error('File backup terlalu besar. Batas pemulihan adalah 150 MB.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error('File tidak bisa dibaca sebagai JSON backup KasKilat.');
  }

  let rawDatabase: unknown = parsed;
  let rawPhotos: unknown[] = [];
  if (isObject(parsed) && 'format' in parsed) {
    if (parsed.format !== BACKUP_FORMAT || parsed.version !== BACKUP_VERSION) {
      throw new Error('Versi atau format backup tidak didukung.');
    }
    if (!Array.isArray(parsed.photos)) {
      throw new Error('Daftar foto di dalam file backup tidak valid.');
    }
    rawDatabase = parsed.database;
    rawPhotos = parsed.photos;
  }

  const imported = normalizeImportedDatabase(rawDatabase);
  if (!imported) {
    throw new Error('Struktur data backup tidak valid. Periksa file sebelum mencoba lagi.');
  }

  // Validate and decode every photo before writing anything to the photo store.
  const decodedPhotos: Array<{ id: string; blob: Blob }> = [];
  const restoredPhotoIds = new Set<string>();
  for (const value of rawPhotos) {
    if (
      !isObject(value) ||
      typeof value.id !== 'string' ||
      !value.id.trim() ||
      typeof value.data !== 'string' ||
      typeof value.mimeType !== 'string' ||
      !value.mimeType.trim()
    ) {
      throw new Error('Ada data foto yang tidak valid di dalam file backup.');
    }
    if (restoredPhotoIds.has(value.id)) continue;
    restoredPhotoIds.add(value.id);
    decodedPhotos.push({
      id: value.id,
      blob: fromBase64(value.data, value.mimeType),
    });
  }

  const hadCurrentDatabase = Boolean(getSnapshot().database);
  let restoredPhotos = 0;

  for (const photo of decodedPhotos) {
    // A current photo with the same key belongs to the active database; never replace it
    // with bytes from an imported backup that may be older or unrelated.
    const existingPhoto = await getPhotoBlob(photo.id);
    if (existingPhoto) continue;

    try {
      await putPhotoBlob(photo.id, photo.blob);
      restoredPhotos += 1;
    } catch (error) {
      throw new Error(
        `Pemulihan dihentikan karena foto gagal disimpan. Data transaksi belum diubah. Detail: ${error instanceof Error ? error.message : 'kesalahan penyimpanan'}`
      );
    }
  }

  await restoreDatabase(imported);
  return {
    transactionCount: imported.transactions.length,
    photoCount: restoredPhotos,
    merged: hadCurrentDatabase,
  };
}
