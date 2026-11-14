/**
 * @file auth.service.ts
 * @description Login dengan Google via Google Identity Services (GIS).
 * Client ID berasal dari env build (VITE_GOOGLE_CLIENT_ID) atau default publik
 * di constants; pengguna tidak pernah mengisinya.
 */

import { APP_CONFIG, DEFAULT_GOOGLE_CLIENT_ID } from '../../../lib/constants';

const GSI_SRC = 'https://accounts.google.com/gsi/client';
const SCOPES =
  'openid email profile https://www.googleapis.com/auth/drive.file';

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

export interface GoogleSession {
  email: string;
  name?: string;
  picture?: string;
  accessToken: string;
  expiresAt: number;
}

export class GoogleAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoogleAuthError';
  }
}

function readSessionFromStorage(): GoogleSession | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.GOOGLE_SESSION);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GoogleSession>;
    if (!parsed.email || typeof parsed.accessToken !== 'string') return null;
    return {
      email: parsed.email,
      name: parsed.name,
      picture: parsed.picture,
      accessToken: parsed.accessToken,
      expiresAt: Number(parsed.expiresAt) || 0,
    };
  } catch {
    return null;
  }
}

let session: GoogleSession | null = readSessionFromStorage();

function persistSession(next: GoogleSession | null): void {
  session = next;
  try {
    if (next) {
      localStorage.setItem(APP_CONFIG.STORAGE_KEYS.GOOGLE_SESSION, JSON.stringify(next));
    } else {
      localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.GOOGLE_SESSION);
    }
  } catch {
    // localStorage bisa diblokir; sesi tetap hidup di memori
  }
  window.dispatchEvent(new CustomEvent('kaskilat:auth-changed'));
}

export function getGoogleClientId(): string {
  return String(import.meta.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID).trim();
}

export function isGoogleConfigured(): boolean {
  return Boolean(getGoogleClientId());
}

export function getSession(): GoogleSession | null {
  return session;
}

export function hasGoogleSession(): boolean {
  return Boolean(session?.email);
}

export function getSessionEmail(): string | null {
  return session?.email ?? null;
}

export function isAccessTokenValid(): boolean {
  return Boolean(session?.accessToken && session.expiresAt > Date.now() + 60_000);
}

export async function getAccessToken(): Promise<string> {
  return ensureAccessToken();
}

function loadGsiScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () =>
        reject(new GoogleAuthError('Gagal memuat Google Identity Services.'))
      );
      return;
    }

    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new GoogleAuthError('Gagal memuat Google Identity Services.'));
    document.head.appendChild(script);
  });
}

async function fetchUserInfo(accessToken: string): Promise<{
  email: string;
  name?: string;
  picture?: string;
}> {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new GoogleAuthError(
      'Berhasil masuk Google, tetapi profil akun tidak bisa dibaca. Coba lagi.'
    );
  }
  const data = (await response.json()) as { email?: string; name?: string; picture?: string };
  if (!data.email) throw new GoogleAuthError('Akun Google tidak mengembalikan alamat email.');
  return { email: data.email, name: data.name, picture: data.picture };
}

/**
 * Membuka consent Google. Harus dipanggil dari aksi pengguna (klik tombol).
 * `prompt: 'consent'` dipakai untuk login eksplisit; string kosong untuk refresh senyap.
 */
export async function connectGoogle(
  options: { prompt?: string } = {}
): Promise<GoogleSession> {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new GoogleAuthError(
      'Login Google belum diaktifkan pada build ini. Kamu tetap bisa memakai Mode Tamu.'
    );
  }

  await loadGsiScript();
  if (!window.google?.accounts?.oauth2) {
    throw new GoogleAuthError('Google Identity Services tidak tersedia di browser ini.');
  }

  return new Promise<GoogleSession>((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };

    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: (response) => {
        if (response.error || !response.access_token) {
          finish(() =>
            reject(
              new GoogleAuthError(
                response.error_description ||
                  'Izin Google ditolak. Login dibatalkan dan data tetap aman di HP ini.'
              )
            )
          );
          return;
        }

        const accessToken = response.access_token;
        const expiresIn = Number(response.expires_in || 3600);

        fetchUserInfo(accessToken)
          .then((profile) => {
            const next: GoogleSession = {
              email: profile.email,
              name: profile.name,
              picture: profile.picture,
              accessToken,
              expiresAt: Date.now() + expiresIn * 1000,
            };
            persistSession(next);
            finish(() => resolve(next));
          })
          .catch((error) => {
            finish(() =>
              reject(
                error instanceof Error
                  ? error
                  : new GoogleAuthError('Gagal membaca profil Google.')
              )
            );
          });
      },
      error_callback: (error) => {
        finish(() =>
          reject(
            new GoogleAuthError(
              error?.message || 'Jendela login Google ditutup sebelum selesai.'
            )
          )
        );
      },
    });

    client.requestAccessToken({ prompt: options.prompt ?? 'consent' });
  });
}

/**
 * Token valid dari cache, atau refresh senyap sekali bila sesi masih tersimpan.
 */
export async function ensureAccessToken(): Promise<string> {
  if (isAccessTokenValid() && session) return session.accessToken;

  if (!session?.email) {
    throw new GoogleAuthError('Belum login Google. Data tetap aman di perangkat ini.');
  }

  try {
    const refreshed = await connectGoogle({ prompt: '' });
    return refreshed.accessToken;
  } catch (error) {
    throw new GoogleAuthError(
      error instanceof Error
        ? `Sesi Google berakhir. Klik Login dengan Google untuk menyambung lagi. (${error.message})`
        : 'Sesi Google berakhir. Klik Login dengan Google untuk menyambung lagi.'
    );
  }
}

export function disconnectGoogle(): void {
  const current = session;
  persistSession(null);
  if (current?.accessToken && window.google?.accounts?.oauth2) {
    try {
      window.google.accounts.oauth2.revoke(current.accessToken);
    } catch {
      // Abaikan kegagalan revoke
    }
  }
}
