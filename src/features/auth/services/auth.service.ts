/**
 * @file auth.service.ts
 * @description Login dengan Google via Google Identity Services (GIS).
 * Client ID berasal dari env build (VITE_GOOGLE_CLIENT_ID) atau default publik
 * di constants; pengguna tidak pernah mengisinya.
 * Profil + token disimpan di localStorage agar aplikasi tidak minta login ulang
 * tiap dibuka. Token tetap berumur ~1 jam; sesi panjang diperbarui diam-diam
 * lewat pengalihan halaman (lihat GOOGLE_SILENT_RESTORE_ENABLED di constants).
 */

import {
  APP_CONFIG,
  DEFAULT_GOOGLE_CLIENT_ID,
  GOOGLE_SILENT_RESTORE_ENABLED,
  GOOGLE_SILENT_RESTORE_ORIGINS,
} from '../../../lib/constants';

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

/**
 * Profil dan access token dipersistenkan supaya aplikasi yang ditutup lalu dibuka
 * lagi tidak meminta login ulang. Token tetap punya masa berlaku (~1 jam) dan
 * diperbarui diam-diam selagi aplikasi terbuka; setelah kedaluwarsa pengguna
 * cukup menekan "Sambungkan" sekali (akun Google biasanya sudah terpilih).
 */
function readSessionFromStorage(): GoogleSession | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.GOOGLE_SESSION);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GoogleSession>;
    if (!parsed.email) {
      localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.GOOGLE_SESSION);
      return null;
    }
    const expiresAt = Number(parsed.expiresAt) || 0;
    const tokenUsable = Boolean(parsed.accessToken) && expiresAt > Date.now();
    return {
      email: parsed.email,
      name: parsed.name,
      picture: parsed.picture,
      accessToken: tokenUsable ? String(parsed.accessToken) : '',
      expiresAt: tokenUsable ? expiresAt : 0,
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
  if (next) scheduleTokenRefresh();
  window.dispatchEvent(new CustomEvent('kaskilat:auth-changed'));
}

const REFRESH_MARGIN_MS = 5 * 60_000;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Perbarui token diam-diam beberapa menit sebelum kedaluwarsa, selagi aplikasi
 * masih terbuka. Kalau browser memblokir (mis. tanpa interaksi), abaikan saja:
 * token lama tetap dipakai sampai habis dan pengguna bisa menyambung manual.
 */
function scheduleTokenRefresh(): void {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = null;
  if (!session?.accessToken) return;
  const delay = session.expiresAt - Date.now() - REFRESH_MARGIN_MS;
  if (delay <= 0) return;
  refreshTimer = setTimeout(() => {
    void connectGoogle({ prompt: '' }).catch(() => undefined);
  }, delay);
}

scheduleTokenRefresh();

/* ------------------------------------------------------------------ */
/* Sesi panjang: kembali dari pengalihan Google                        */
/* ------------------------------------------------------------------ */

export type RedirectIntent = 'login' | 'restore';

const REDIRECT_STATE_KEY = 'kaskilat_google_redirect_state';
const REDIRECT_INTENT_KEY = 'kaskilat_google_redirect_intent';
const REDIRECT_ATTEMPT_KEY = 'kaskilat_google_redirect_at';
const REDIRECT_BLOCKED_KEY = 'kaskilat_google_redirect_blocked_until';
const REDIRECT_ERROR_KEY = 'kaskilat_google_redirect_error';
const SILENT_RESTORE_MIN_GAP_MS = 30 * 60_000;
const SILENT_RESTORE_BLOCK_MS = 24 * 60 * 60_000;
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';

let pendingRedirectToken: { accessToken: string; expiresAt: number } | null = null;

/**
 * Alamat kembali setelah pengalihan Google harus sama persis dengan yang
 * didaftarkan di Google Cloud Console (Authorized redirect URI).
 */
export function getRedirectUri(): string {
  const base = import.meta.env.BASE_URL || '/';
  return new URL(base, window.location.origin).href;
}

function createState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Berpindah ke halaman izin Google di tab yang sama (bukan popup), lalu Google
 * mengembalikan token pada bagian #hash alamat aplikasi.
 * prompt 'none' = benar-benar diam; 'select_account' = pengguna memilih akun.
 */
export function startGoogleRedirect(intent: RedirectIntent, prompt: string): void {
  const state = createState();
  try {
    localStorage.setItem(REDIRECT_STATE_KEY, state);
    localStorage.setItem(REDIRECT_INTENT_KEY, intent);
  } catch {
    // Tanpa penyimpanan state, pengalihan tidak bisa diverifikasi; batalkan.
    return;
  }

  const params = new URLSearchParams({
    client_id: getGoogleClientId(),
    redirect_uri: getRedirectUri(),
    response_type: 'token',
    scope: SCOPES,
    state,
    prompt,
  });
  window.location.assign(`${AUTH_ENDPOINT}?${params.toString()}`);
}

/**
 * Bila halaman dibuka kembali dari Google, token ada di bagian #hash URL.
 * Ambil tokennya lalu bersihkan alamat supaya tidak tertinggal di riwayat.
 */
function readRedirectCredentials(): { accessToken: string; expiresAt: number } | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return null;

  const params = new URLSearchParams(hash);
  const token = params.get('access_token');
  const hasError = params.has('error');
  if (!token && !hasError) return null;

  window.history.replaceState(
    {},
    document.title,
    window.location.pathname + window.location.search
  );

  let expectedState = '';
  try {
    expectedState = localStorage.getItem(REDIRECT_STATE_KEY) || '';
    localStorage.removeItem(REDIRECT_STATE_KEY);
    // Cap percobaan sengaja dibiarkan: mencegah pengalihan ulang berturut-turut
    // bila Google tidak mengembalikan token yang bisa dipakai.
  } catch {
    // abaikan
  }

  const stateMatches = Boolean(expectedState) && params.get('state') === expectedState;

  if (!token || hasError || !stateMatches) {
    if (hasError) {
      try {
        const message = params.get('error_description');
        if (message) localStorage.setItem(REDIRECT_ERROR_KEY, message);
      } catch {
        // abaikan
      }
    }
    // Jangan membebani pengguna dengan pengalihan berulang; coba lagi nanti.
    try {
      localStorage.setItem(REDIRECT_BLOCKED_KEY, String(Date.now() + SILENT_RESTORE_BLOCK_MS));
    } catch {
      // abaikan
    }
    return null;
  }

  const expiresIn = Number(params.get('expires_in') || 3600);
  return { accessToken: token, expiresAt: Date.now() + expiresIn * 1000 };
}

pendingRedirectToken = readRedirectCredentials();

/**
 * Selesaikan login yang baru kembali dari Google. Dipanggil saat aplikasi mulai,
 * sebelum menentukan mode tamu/akun.
 */
export async function resolveRedirectLogin(): Promise<GoogleSession | null> {
  const credentials = pendingRedirectToken;
  pendingRedirectToken = null;
  if (!credentials) return null;

  try {
    const profile = await fetchUserInfo(credentials.accessToken);
    const next: GoogleSession = {
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
      accessToken: credentials.accessToken,
      expiresAt: credentials.expiresAt,
    };
    try {
      localStorage.removeItem(REDIRECT_BLOCKED_KEY);
    } catch {
      // abaikan
    }
    persistSession(next);
    return next;
  } catch {
    // Token tidak bisa dipakai (mis. jaringan putus). Beri jeda sebelum
    // mencoba mengalihkan lagi supaya aplikasi tidak bolak-balik ke Google.
    try {
      sessionStorage.setItem(REDIRECT_ATTEMPT_KEY, String(Date.now()));
    } catch {
      // abaikan
    }
    return null;
  }
}

/** Alasan pengalihan terakhir (mis. pengguna menutup izin Google), sekali pakai. */
export function takeRedirectIntent(): RedirectIntent | null {
  try {
    const value = localStorage.getItem(REDIRECT_INTENT_KEY);
    localStorage.removeItem(REDIRECT_INTENT_KEY);
    return value === 'login' || value === 'restore' ? value : null;
  } catch {
    return null;
  }
}

export function takeRedirectError(): string | null {
  try {
    const value = localStorage.getItem(REDIRECT_ERROR_KEY);
    localStorage.removeItem(REDIRECT_ERROR_KEY);
    return value;
  } catch {
    return null;
  }
}

/**
 * Perbarui token diam-diam lewat pengalihan halaman. Dengan prompt 'none',
 * Google tidak menampilkan layar apa pun: bila akun Google masih login, token
 * baru langsung dikembalikan; bila tidak, aplikasi tetap terbuka dengan data lokal.
 * Mengembalikan true bila halaman sedang berpindah ke Google.
 */
export function isLongSessionEnabled(): boolean {
  if (!GOOGLE_SILENT_RESTORE_ENABLED) return false;
  return GOOGLE_SILENT_RESTORE_ORIGINS.includes(window.location.origin);
}

export function startSilentGoogleRestore(): boolean {
  if (!isLongSessionEnabled()) return false;
  if (!isGoogleConfigured() || !hasGoogleSession() || isAccessTokenValid()) return false;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;

  try {
    if (Number(localStorage.getItem(REDIRECT_BLOCKED_KEY) || 0) > Date.now()) return false;
    const lastAttempt = Number(sessionStorage.getItem(REDIRECT_ATTEMPT_KEY) || 0);
    if (Date.now() - lastAttempt < SILENT_RESTORE_MIN_GAP_MS) return false;
  } catch {
    // Tanpa penyimpanan pembatas tetap boleh mencoba sekali
  }

  try {
    sessionStorage.setItem(REDIRECT_ATTEMPT_KEY, String(Date.now()));
  } catch {
    // abaikan
  }

  startGoogleRedirect('restore', 'none');
  return true;
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

let pendingConnect: Promise<GoogleSession> | null = null;

/**
 * Membuka consent Google. Harus dipanggil dari aksi pengguna (klik tombol).
 * String kosong = browser memakai sesi Google yang ada (tanpa layar izin ulang);
 * 'consent' hanya untuk kasus yang memang butuh izin ulang.
 * Panggilan ganda digabung supaya tidak muncul dua jendela Google sekaligus.
 */
export function connectGoogle(options: { prompt?: string } = {}): Promise<GoogleSession> {
  if (pendingConnect) return pendingConnect;
  pendingConnect = connectGoogleInternal(options).finally(() => {
    pendingConnect = null;
  });
  return pendingConnect;
}

async function connectGoogleInternal(
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

    client.requestAccessToken({ prompt: options.prompt ?? '' });
  });
}

/**
 * Token dari memori, atau refresh senyap sekali bila profil sesi masih tersimpan.
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
