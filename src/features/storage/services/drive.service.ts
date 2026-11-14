/**
 * @file drive.service.ts
 * @description Google Drive sebagai database pengguna.
 * Struktur: folder `KasKilat` / `kaskilat-database.json` + subfolder `photos`.
 * Scope drive.file: aplikasi hanya melihat file yang dibuatnya sendiri.
 */

import {
  ensureAccessToken,
  getSessionEmail,
  hasGoogleSession,
  isGoogleConfigured,
  GoogleAuthError,
} from '../../auth/services/auth.service';
import { APP_CONFIG } from '../../../lib/constants';
import type { KasKilatDatabase } from '../../database/types/database.type';
import { normalizeDatabase } from '../../database/services/database-utils';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

const FOLDER_NAME = 'KasKilat';
const LEGACY_FOLDER_NAME = 'KasKilat UMKM';
const PHOTOS_FOLDER_NAME = 'photos';
const DATABASE_FILE_NAME = 'kaskilat-database.json';

const FOLDER_URL_BASE = 'https://drive.google.com/drive/folders';
const FILE_URL_BASE = 'https://drive.google.com/file/d';

const CACHE_PREFIX = APP_CONFIG.STORAGE_KEYS.DRIVE_FOLDER_PREFIX;

// PNG 1x1 untuk uji unggah
const TEST_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

export class DriveError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'DriveError';
  }
}

export interface DriveDatabaseResult {
  database: KasKilatDatabase;
  fileId: string;
}

export interface DriveTestResult {
  fileId: string;
  fileName: string;
  folderId: string;
  folderUrl: string;
  fileUrl: string;
}

/* ------------------------------------------------------------------ */
/* Status koneksi                                                      */
/* ------------------------------------------------------------------ */

export function isDriveConfigured(): boolean {
  return isGoogleConfigured();
}

export function isDriveConnected(): boolean {
  return hasGoogleSession();
}

export function getConnectedDriveEmail(): string | null {
  return getSessionEmail();
}

/* ------------------------------------------------------------------ */
/* Cache ID per akun                                                   */
/* ------------------------------------------------------------------ */

function cacheKey(kind: 'folder' | 'photos' | 'database'): string | null {
  const email = getSessionEmail();
  return email ? `${CACHE_PREFIX}${email.toLowerCase()}_${kind}` : null;
}

function readCache(kind: 'folder' | 'photos' | 'database'): string | null {
  const key = cacheKey(kind);
  if (!key) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeCache(kind: 'folder' | 'photos' | 'database', value: string | null): void {
  const key = cacheKey(kind);
  if (!key) return;
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // cache hanya optimasi
  }
}

export function clearDriveCache(): void {
  writeCache('folder', null);
  writeCache('photos', null);
  writeCache('database', null);
}

export function getCachedFolderUrl(): string | null {
  const folderId = readCache('folder');
  return folderId ? `${FOLDER_URL_BASE}/${folderId}` : null;
}

export function getCachedDatabaseUrl(): string | null {
  const fileId = readCache('database');
  return fileId ? `${FILE_URL_BASE}/${fileId}/view` : null;
}

/* ------------------------------------------------------------------ */
/* Fetch + error handling                                              */
/* ------------------------------------------------------------------ */

async function authorizedFetch(url: string, init?: RequestInit): Promise<Response> {
  const accessToken = await ensureAccessToken();

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch {
    throw new DriveError(
      'Tidak dapat menghubungi Google Drive. Periksa koneksi internet lalu coba lagi.'
    );
  }

  if (response.status === 401) {
    throw new GoogleAuthError(
      'Sesi Google berakhir. Klik Login dengan Google untuk menyambung lagi.'
    );
  }
  return response;
}

function describeDriveError(status: number, message: string): string {
  const raw = message || `HTTP ${status}`;

  if (
    status === 403 &&
    /has not been used|accessNotConfigured|SERVICE_DISABLED|is disabled/i.test(raw)
  ) {
    return (
      'Google Drive API belum diaktifkan pada project Google Cloud. ' +
      'Buka console.cloud.google.com → APIs & Services → Library → aktifkan "Google Drive API".'
    );
  }
  if (status === 403 && /insufficient|permission|forbidden|storageQuota/i.test(raw)) {
    return 'Akun Google tidak memberi izin menulis ke Drive. Coba login ulang dengan izin penuh.';
  }
  if (status === 404) {
    return 'File/folder tidak ditemukan di Drive akun ini. Folder akan dibuat ulang otomatis.';
  }
  if (status === 429) {
    return 'Google Drive sedang membatasi permintaan. Coba lagi beberapa saat lagi.';
  }
  if (status >= 500) {
    return 'Server Google Drive sedang bermasalah. Coba lagi beberapa saat lagi.';
  }
  return raw;
}

async function readErrorText(response: Response): Promise<string> {
  let message = `HTTP ${response.status}`;
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    if (body.error?.message) message = body.error.message;
  } catch {
    // respons tanpa JSON
  }
  return describeDriveError(response.status, message);
}

async function throwDriveError(response: Response): Promise<never> {
  throw new DriveError(await readErrorText(response), response.status);
}

/* ------------------------------------------------------------------ */
/* Folder                                                              */
/* ------------------------------------------------------------------ */

async function isFolderUsable(folderId: string): Promise<boolean> {
  try {
    const response = await authorizedFetch(
      `${DRIVE_API}/files/${encodeURIComponent(folderId)}?fields=id,trashed&supportsAllDrives=true`
    );
    if (!response.ok) return false;
    const data = (await response.json()) as { id?: string; trashed?: boolean };
    return Boolean(data.id) && !data.trashed;
  } catch (error) {
    if (error instanceof GoogleAuthError) throw error;
    return false;
  }
}

async function findFolder(name: string): Promise<string | null> {
  const query = encodeURIComponent(
    `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const response = await authorizedFetch(
    `${DRIVE_API}/files?q=${query}&fields=files(id,name)&spaces=drive&pageSize=10`
  );
  if (!response.ok) await throwDriveError(response);
  const data = (await response.json()) as { files?: Array<{ id: string }> };
  return data.files?.[0]?.id ?? null;
}

async function createFolder(name: string, parentId?: string): Promise<string> {
  const response = await authorizedFetch(`${DRIVE_API}/files?fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      ...(parentId ? { parents: [parentId] } : {}),
    }),
  });
  if (!response.ok) await throwDriveError(response);
  const data = (await response.json()) as { id: string };
  return data.id;
}

async function renameFolder(folderId: string, name: string): Promise<void> {
  const response = await authorizedFetch(
    `${DRIVE_API}/files/${encodeURIComponent(folderId)}?fields=id`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }
  );
  if (!response.ok) await throwDriveError(response);
}

/**
 * Folder utama `KasKilat`. Folder lama `KasKilat UMKM` diubah namanya agar data
 * pengguna versi sebelumnya tidak hilang.
 */
export async function getOrCreateFolder(options?: { refresh?: boolean }): Promise<string> {
  if (!getSessionEmail()) {
    throw new GoogleAuthError('Belum login Google. Data tetap aman di perangkat ini.');
  }

  const stale = readCache('folder');
  if (stale && !options?.refresh) {
    if (await isFolderUsable(stale)) return stale;
    writeCache('folder', null);
  }

  await ensureAccessToken();

  const existing = await findFolder(FOLDER_NAME);
  if (existing) {
    writeCache('folder', existing);
    return existing;
  }

  const legacy = await findFolder(LEGACY_FOLDER_NAME);
  if (legacy) {
    await renameFolder(legacy, FOLDER_NAME);
    writeCache('folder', legacy);
    return legacy;
  }

  const created = await createFolder(FOLDER_NAME);
  writeCache('folder', created);
  return created;
}

export async function getOrCreatePhotosFolder(parentFolderId?: string): Promise<string> {
  if (!parentFolderId) {
    const cached = readCache('photos');
    if (cached && (await isFolderUsable(cached))) return cached;
  }

  const parentId = parentFolderId ?? (await getOrCreateFolder());

  const query = encodeURIComponent(
    `name='${PHOTOS_FOLDER_NAME}' and '${parentId}' in parents and ` +
      `mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const response = await authorizedFetch(
    `${DRIVE_API}/files?q=${query}&fields=files(id,name)&spaces=drive&pageSize=5`
  );
  if (!response.ok) await throwDriveError(response);
  const data = (await response.json()) as { files?: Array<{ id: string }> };
  if (data.files?.[0]) {
    writeCache('photos', data.files[0].id);
    return data.files[0].id;
  }

  const created = await createFolder(PHOTOS_FOLDER_NAME, parentId);
  writeCache('photos', created);
  return created;
}

/* ------------------------------------------------------------------ */
/* File database                                                       */
/* ------------------------------------------------------------------ */

async function findFileInFolder(folderId: string, fileName: string): Promise<string | null> {
  const query = encodeURIComponent(
    `name='${fileName}' and '${folderId}' in parents and trashed=false`
  );
  const response = await authorizedFetch(
    `${DRIVE_API}/files?q=${query}&fields=files(id,name)&spaces=drive&pageSize=5`
  );
  if (!response.ok) await throwDriveError(response);
  const data = (await response.json()) as { files?: Array<{ id: string }> };
  return data.files?.[0]?.id ?? null;
}

/**
 * Ambil database dari Drive. Mengembalikan null bila file belum ada.
 */
export async function downloadDatabaseFromDrive(): Promise<DriveDatabaseResult | null> {
  const folderId = await getOrCreateFolder();

  let fileId = readCache('database');
  if (fileId) {
    const check = await authorizedFetch(
      `${DRIVE_API}/files/${encodeURIComponent(fileId)}?fields=id,trashed`
    );
    if (!check.ok) {
      fileId = null;
      writeCache('database', null);
    } else {
      const info = (await check.json()) as { trashed?: boolean };
      if (info.trashed) {
        fileId = null;
        writeCache('database', null);
      }
    }
  }

  if (!fileId) {
    fileId = await findFileInFolder(folderId, DATABASE_FILE_NAME);
    if (fileId) writeCache('database', fileId);
  }

  if (!fileId) return null;

  const response = await authorizedFetch(
    `${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media`,
    { cache: 'no-store' }
  );

  if (response.status === 404) {
    writeCache('database', null);
    return null;
  }
  if (!response.ok) await throwDriveError(response);

  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    throw new DriveError('File database di Drive rusak dan tidak bisa dibaca.');
  }

  const database = normalizeDatabase(raw);
  if (!database) {
    throw new DriveError('Format database di Drive tidak dikenali.');
  }

  return { database, fileId };
}

/**
 * Tulis database ke Drive: update isi file yang sudah ada, atau buat baru.
 */
export async function uploadDatabaseToDrive(
  database: KasKilatDatabase
): Promise<{ fileId: string }> {
  const folderId = await getOrCreateFolder();
  const json = JSON.stringify(database);

  let fileId = readCache('database');
  if (!fileId) {
    fileId = await findFileInFolder(folderId, DATABASE_FILE_NAME);
    if (fileId) writeCache('database', fileId);
  }

  if (fileId) {
    const response = await authorizedFetch(
      `${DRIVE_UPLOAD_API}/files/${encodeURIComponent(fileId)}?uploadType=media&fields=id`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: json,
      }
    );

    if (response.status === 404) {
      writeCache('database', null);
    } else if (!response.ok) {
      await throwDriveError(response);
    } else {
      const data = (await response.json()) as { id: string };
      writeCache('database', data.id);
      return { fileId: data.id };
    }
  }

  const boundary = `kaskilat_${Math.random().toString(36).slice(2)}`;
  const metadata = {
    name: DATABASE_FILE_NAME,
    mimeType: 'application/json',
    parents: [folderId],
    appProperties: { source: 'kaskilat-db' },
  };

  const body = new Blob(
    [
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
      JSON.stringify(metadata),
      `\r\n--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
      json,
      `\r\n--${boundary}--`,
    ],
    { type: `multipart/related; boundary=${boundary}` }
  );

  const response = await authorizedFetch(
    `${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id`,
    {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    }
  );

  if (!response.ok) await throwDriveError(response);

  const created = (await response.json()) as { id: string };
  writeCache('database', created.id);
  return { fileId: created.id };
}

/* ------------------------------------------------------------------ */
/* Foto                                                                */
/* ------------------------------------------------------------------ */

export async function uploadFileToDrive(
  blob: Blob,
  fileName: string
): Promise<{ id: string; name: string }> {
  const photosFolderId = await getOrCreatePhotosFolder();
  const mimeType = blob.type || 'image/jpeg';
  const boundary = `kaskilat_${Math.random().toString(36).slice(2)}`;

  const metadata = {
    name: fileName,
    mimeType,
    parents: [photosFolderId],
    appProperties: { source: 'kaskilat-photo' },
  };

  const body = new Blob(
    [
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
      JSON.stringify(metadata),
      `\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
      blob,
      `\r\n--${boundary}--`,
    ],
    { type: `multipart/related; boundary=${boundary}` }
  );

  const response = await authorizedFetch(
    `${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id,name`,
    {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    }
  );

  if (!response.ok) await throwDriveError(response);
  const data = (await response.json()) as { id: string; name?: string };
  return { id: data.id, name: data.name || fileName };
}

export async function testDriveUpload(): Promise<DriveTestResult> {
  const folderId = await getOrCreateFolder({ refresh: true });
  await getOrCreatePhotosFolder(folderId);

  const binary = atob(TEST_PNG_BASE64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);

  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  const stamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  const file = await uploadFileToDrive(
    new Blob([bytes], { type: 'image/png' }),
    `tes-koneksi-${stamp}.png`
  );

  return {
    fileId: file.id,
    fileName: file.name,
    folderId,
    folderUrl: `${FOLDER_URL_BASE}/${folderId}`,
    fileUrl: `${FILE_URL_BASE}/${file.id}/view`,
  };
}

export async function fetchDriveFileBlob(fileId: string): Promise<Blob> {
  const response = await authorizedFetch(
    `${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media`
  );
  if (!response.ok) await throwDriveError(response);
  return response.blob();
}

export async function deleteDriveFile(fileId: string): Promise<void> {
  const response = await authorizedFetch(`${DRIVE_API}/files/${encodeURIComponent(fileId)}`, {
    method: 'DELETE',
  });
  if (!response.ok && response.status !== 404) await throwDriveError(response);
}
