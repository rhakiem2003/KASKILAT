/**
 * @file drive.service.ts
 * @description Integrasi Google Drive via Google Identity Services (OAuth token di browser)
 * dengan scope drive.file: aplikasi hanya bisa mengakses file/folder yang dibuatnya sendiri.
 */

import { getGoogleClientId } from '../../../lib/settings';

const GSI_SRC = 'https://accounts.google.com/gsi/client';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const SCOPES = 'openid email https://www.googleapis.com/auth/drive.file';
const FOLDER_NAME = 'KasKilat UMKM';
const TOKEN_KEY = 'kaskilat_gdrive_token';
const FOLDER_KEY = 'kaskilat_gdrive_folder';
const FOLDER_URL_BASE = 'https://drive.google.com/drive/folders';
const FILE_URL_BASE = 'https://drive.google.com/file/d';
// PNG 1x1 untuk uji unggah tanpa mengganggu folder
const TEST_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

interface TokenResponse {
  access_token?: string;
  expires_in?: number | string;
  error?: string;
  error_description?: string;
}

interface TokenClient {
  requestAccessToken: (overrides?: { prompt?: string }) => void;
}

interface TokenClientConfig {
  client_id: string;
  scope: string;
  callback: (response: TokenResponse) => void;
  error_callback?: (error: { type?: string; message?: string }) => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: TokenClientConfig) => TokenClient;
          revoke: (token: string, done?: () => void) => void;
        };
      };
    };
  }
}

interface StoredToken {
  accessToken: string;
  expiresAt: number;
  email?: string;
}

export class DriveAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DriveAuthError';
  }
}

let token: StoredToken | null = readStoredToken();

function readStoredToken(): StoredToken | null {
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredToken;
    if (!parsed.accessToken || parsed.expiresAt <= Date.now() + 30_000) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persistToken(next: StoredToken | null): void {
  token = next;
  try {
    if (next) sessionStorage.setItem(TOKEN_KEY, JSON.stringify(next));
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // sessionStorage bisa diblokir; token tetap hidup di memori
  }
}

export function isDriveConfigured(): boolean {
  return Boolean(getGoogleClientId());
}

export function isDriveConnected(): boolean {
  return Boolean(token && token.expiresAt > Date.now() + 30_000);
}

export function getConnectedDriveEmail(): string | null {
  return isDriveConnected() ? token?.email || null : null;
}

function requireAccessToken(): string {
  if (!isDriveConnected() || !token) {
    throw new DriveAuthError('Google Drive belum terhubung. Buka Pengaturan untuk menghubungkan.');
  }
  return token.accessToken;
}

function loadGsiScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Gagal memuat Google Identity Services.')));
      return;
    }

    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Gagal memuat Google Identity Services.'));
    document.head.appendChild(script);
  });
}

async function fetchUserEmail(accessToken: string): Promise<string | undefined> {
  try {
    const response = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return undefined;
    const data = (await response.json()) as { email?: string };
    return data.email;
  } catch {
    return undefined;
  }
}

/**
 * Membuka popup consent Google. Harus dipanggil dari aksi user (klik tombol).
 */
export async function connectDrive(): Promise<{ email?: string }> {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error('Google OAuth Client ID belum diisi. Tambahkan dulu di Pengaturan.');
  }

  await loadGsiScript();

  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google Identity Services tidak tersedia.');
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };

    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: (response: TokenResponse) => {
        if (response.error || !response.access_token) {
          finish(() =>
            reject(
              new Error(
                response.error_description ||
                  'Izin Google Drive ditolak. Pastikan Client ID & origin sudah benar.'
              )
            )
          );
          return;
        }

        const expiresIn = Number(response.expires_in || 3600);
        persistToken({
          accessToken: response.access_token,
          expiresAt: Date.now() + expiresIn * 1000,
        });

        fetchUserEmail(response.access_token)
          .then((email) => {
            if (email && token) {
              persistToken({ ...token, email });
            }
          })
          .finally(() => finish(() => resolve({ email: token?.email })));
      },
      error_callback: (error) => {
        finish(() =>
          reject(new Error(error?.message || 'Popup izin Google ditutup sebelum selesai.'))
        );
      },
    });

    client.requestAccessToken({ prompt: '' });
  });
}

export function disconnectDrive(): void {
  const current = token;
  persistToken(null);
  localStorage.removeItem(FOLDER_KEY);
  if (current && window.google?.accounts?.oauth2) {
    try {
      window.google.accounts.oauth2.revoke(current.accessToken);
    } catch {
      // Abaikan kegagalan revoke
    }
  }
}

async function authorizedFetch(url: string, init?: RequestInit): Promise<Response> {
  const accessToken = requireAccessToken();
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
    throw new Error(
      'Tidak dapat menghubungi Google Drive. Periksa koneksi internet atau pemblokir iklan.'
    );
  }

  if (response.status === 401) {
    persistToken(null);
    throw new DriveAuthError('Sesi Google Drive berakhir. Hubungkan ulang dari Pengaturan.');
  }
  return response;
}

/**
 * Menerjemahkan error Drive API menjadi langkah perbaikan yang jelas bagi pengguna.
 */
function describeDriveError(status: number, message: string): string {
  const raw = message || `HTTP ${status}`;

  if (status === 403 && /has not been used|accessNotConfigured|SERVICE_DISABLED|is disabled/i.test(raw)) {
    return (
      'Google Drive API belum diaktifkan di project Google Cloud. Buka console.cloud.google.com → ' +
      'APIs & Services → Library → aktifkan "Google Drive API", tunggu 1-2 menit, lalu coba lagi.'
    );
  }
  if (status === 403 && /insufficient|permission|forbidden/i.test(raw)) {
    return (
      'Akun Google tidak punya izin menulis ke folder "KasKilat UMKM". Putuskan lalu hubungkan ' +
      'ulang Drive, atau hapus folder lama di Drive agar dibuat ulang.'
    );
  }
  if (status === 404) {
    return (
      'Folder/file tidak ditemukan di akun Google yang terhubung. Cache folder sudah dibersihkan; ' +
      'coba lagi.'
    );
  }
  if (status === 429) {
    return 'Kuota Google Drive sedang penuh. Coba lagi beberapa saat lagi.';
  }
  if (status >= 500) {
    return 'Server Google Drive sedang bermasalah. Coba lagi beberapa saat lagi.';
  }
  return raw;
}

async function readError(response: Response): Promise<string> {
  let message = `HTTP ${response.status}`;
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    if (body.error?.message) message = body.error.message;
  } catch {
    // Respons tanpa JSON; pakai status HTTP
  }
  return describeDriveError(response.status, message);
}

async function isFolderUsable(folderId: string): Promise<boolean> {
  const response = await authorizedFetch(
    `${DRIVE_API}/files/${encodeURIComponent(folderId)}?fields=id,trashed&supportsAllDrives=true`
  );
  if (!response.ok) return false;
  try {
    const data = (await response.json()) as { id?: string; trashed?: boolean };
    return Boolean(data.id) && !data.trashed;
  } catch {
    return false;
  }
}

/**
 * URL folder Drive jika ID-nya sudah pernah di-cache (belum tentu folder masih ada).
 */
export function getCachedFolderUrl(): string | null {
  try {
    const folderId = localStorage.getItem(FOLDER_KEY);
    return folderId ? `${FOLDER_URL_BASE}/${folderId}` : null;
  } catch {
    return null;
  }
}

/**
 * Mengambil (atau membuat) folder penyimpanan aplikasi di Drive.
 * ID folder yang tersimpan divalidasi dulu agar folder yang sudah dihapus / milik akun
 * lain tidak membuat semua unggahan gagal.
 */
export async function getOrCreateFolder(options?: { refresh?: boolean }): Promise<string> {
  if (!options?.refresh) {
    const cached = localStorage.getItem(FOLDER_KEY);
    if (cached) {
      if (await isFolderUsable(cached)) return cached;
      localStorage.removeItem(FOLDER_KEY);
    }
  }

  const query = encodeURIComponent(
    `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const listResponse = await authorizedFetch(
    `${DRIVE_API}/files?q=${query}&fields=files(id,name)&spaces=drive&pageSize=10`
  );

  if (!listResponse.ok) {
    throw new Error(`Gagal mencari folder Drive: ${await readError(listResponse)}`);
  }

  const list = (await listResponse.json()) as { files?: Array<{ id: string }> };
  if (list.files && list.files.length > 0) {
    localStorage.setItem(FOLDER_KEY, list.files[0].id);
    return list.files[0].id;
  }

  const createResponse = await authorizedFetch(`${DRIVE_API}/files?fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!createResponse.ok) {
    throw new Error(`Gagal membuat folder Drive: ${await readError(createResponse)}`);
  }

  const created = (await createResponse.json()) as { id: string };
  localStorage.setItem(FOLDER_KEY, created.id);
  return created.id;
}

/**
 * Upload foto struk ke folder aplikasi dan kembalikan ID file Drive.
 */
export async function uploadFileToDrive(
  blob: Blob,
  fileName: string
): Promise<{ id: string; name: string }> {
  const folderId = await getOrCreateFolder();
  const mimeType = blob.type || 'image/jpeg';
  const boundary = `kaskilat_${Math.random().toString(36).slice(2)}`;

  const metadata = {
    name: fileName,
    mimeType,
    parents: [folderId],
    appProperties: { source: 'kaskilat-umkm' },
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

  if (!response.ok) {
    throw new Error(`Upload ke Drive gagal: ${await readError(response)}`);
  }

  const data = (await response.json()) as { id: string; name?: string };
  return { id: data.id, name: data.name || fileName };
}

export interface DriveTestResult {
  fileId: string;
  fileName: string;
  folderId: string;
  folderUrl: string;
  fileUrl: string;
}

/**
 * Uji tuntas koneksi: pastikan folder ada lalu unggah satu file kecil.
 * Hasilnya bisa dibuka langsung untuk membuktikan file benar-benar masuk Drive.
 */
export async function testDriveUpload(): Promise<DriveTestResult> {
  const folderId = await getOrCreateFolder({ refresh: true });

  const binary = atob(TEST_PNG_BASE64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);

  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  const stamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const fileName = `tes-koneksi-${stamp}.png`;

  const file = await uploadFileToDrive(new Blob([bytes], { type: 'image/png' }), fileName);

  return {
    fileId: file.id,
    fileName: file.name,
    folderId,
    folderUrl: `${FOLDER_URL_BASE}/${folderId}`,
    fileUrl: `${FILE_URL_BASE}/${file.id}/view`,
  };
}

export async function fetchDriveFileBlob(fileId: string): Promise<Blob> {
  const response = await authorizedFetch(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media`);
  if (!response.ok) {
    throw new Error(`Gagal mengambil foto dari Drive: ${await readError(response)}`);
  }
  return response.blob();
}

export async function deleteDriveFile(fileId: string): Promise<void> {
  const response = await authorizedFetch(`${DRIVE_API}/files/${encodeURIComponent(fileId)}`, {
    method: 'DELETE',
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(`Gagal menghapus foto di Drive: ${await readError(response)}`);
  }
}
