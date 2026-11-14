/**
 * @file gemini-settings.ts
 * @description Gemini API key milik pengguna (localStorage) + pengujian koneksi.
 * Key TIDAK pernah dikirim ke server KasKilat dan TIDAK masuk ke database Drive.
 */

import { APP_CONFIG } from './constants';

const USER_KEY = APP_CONFIG.STORAGE_KEYS.GEMINI_API_KEY;
export const DEFAULT_GEMINI_MODEL = 'gemini-3-flash-preview';

export function getUserGeminiKey(): string {
  if (typeof localStorage === 'undefined') return '';
  try {
    return (localStorage.getItem(USER_KEY) || '').trim();
  } catch {
    return '';
  }
}

export function getGeminiKeySource(): 'user' | 'env' | 'none' {
  if (getUserGeminiKey()) return 'user';
  if (String(import.meta.env.VITE_GEMINI_API_KEY || '').trim()) return 'env';
  return 'none';
}

/**
 * Key pengguna diutamakan; env hanya fallback milik developer.
 */
export function getGeminiApiKey(): string | null {
  const userKey = getUserGeminiKey();
  if (userKey) return userKey;
  const envKey = String(import.meta.env.VITE_GEMINI_API_KEY || '').trim();
  return envKey || null;
}

export function saveGeminiApiKey(key: string): void {
  const trimmed = key.trim();
  if (trimmed) localStorage.setItem(USER_KEY, trimmed);
  else localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new CustomEvent('kaskilat:gemini-key-changed'));
}

export function maskApiKey(key: string): string {
  if (!key) return '';
  const visible = key.slice(-4);
  return `${'•'.repeat(Math.max(8, key.length - 4))}${visible}`;
}

export function getGeminiModel(): string {
  return String(import.meta.env.VITE_GEMINI_MODEL || DEFAULT_GEMINI_MODEL).trim() || DEFAULT_GEMINI_MODEL;
}

export interface GeminiKeyTestResult {
  status: 'valid' | 'invalid' | 'quota' | 'error';
  message: string;
}

/**
 * Panggil Gemini dengan prompt sangat kecil untuk memastikan key benar-benar bisa dipakai.
 */
export async function testGeminiKey(apiKey = getGeminiApiKey()): Promise<GeminiKeyTestResult> {
  const key = (apiKey || '').trim();
  if (!key) {
    return { status: 'invalid', message: 'Belum ada API key. Tempel key dari Google AI Studio.' };
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        getGeminiModel()
      )}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Balas dengan satu kata: OK' }] }],
          generationConfig: { temperature: 0 },
        }),
      }
    );

    if (response.ok) {
      return { status: 'valid', message: '✅ Valid — Gemini siap dipakai.' };
    }

    if (response.status === 429) {
      return { status: 'quota', message: 'Quota Habis — coba lagi nanti atau pakai OCR offline.' };
    }

    const detail = await response
      .json()
      .then((body: { error?: { message?: string } }) => body?.error?.message || '')
      .catch(() => '');

    if (response.status === 400 || response.status === 403) {
      return {
        status: 'invalid',
        message: `❌ Invalid — key ditolak Google${detail ? `: ${detail}` : '.'}`,
      };
    }

    return {
      status: 'error',
      message: `Gemini tidak bisa dipakai (HTTP ${response.status})${detail ? `: ${detail}` : ''}`,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { status: 'error', message: 'Tes timeout. Periksa koneksi internet lalu coba lagi.' };
    }
    return {
      status: 'error',
      message: 'Tidak bisa menghubungi Gemini. Periksa koneksi internet.',
    };
  } finally {
    window.clearTimeout(timeout);
  }
}
