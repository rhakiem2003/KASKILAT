/**
 * @file settings.ts
 * @description Penyimpanan kredensial integrasi (Gemini & Google Drive) yang dapat diubah runtime tanpa rebuild.
 */

import { APP_CONFIG } from './constants';

export interface IntegrationSettings {
  geminiApiKey: string;
  googleClientId: string;
}

const SETTINGS_KEY = APP_CONFIG.STORAGE_KEYS.USER_SETTINGS;

const EMPTY_SETTINGS: IntegrationSettings = {
  geminiApiKey: '',
  googleClientId: '',
};

function readStored(): Partial<IntegrationSettings> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? (JSON.parse(raw) as Partial<IntegrationSettings>) : {};
  } catch {
    return {};
  }
}

export function getIntegrationSettings(): IntegrationSettings {
  const stored = readStored();
  return {
    geminiApiKey: typeof stored.geminiApiKey === 'string' ? stored.geminiApiKey : '',
    googleClientId: typeof stored.googleClientId === 'string' ? stored.googleClientId : '',
  };
}

export function saveIntegrationSettings(
  partial: Partial<IntegrationSettings>
): IntegrationSettings {
  const next = { ...getIntegrationSettings(), ...partial };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('kaskilat:settings-changed'));
  return next;
}

/**
 * API key dari pengaturan runtime, dengan fallback ke environment variable saat build.
 */
export function getGeminiApiKey(): string | null {
  const fromSettings = getIntegrationSettings().geminiApiKey.trim();
  const fromEnv = String(import.meta.env.VITE_GEMINI_API_KEY || '').trim();
  return fromSettings || fromEnv || null;
}

export function getGoogleClientId(): string | null {
  const fromSettings = getIntegrationSettings().googleClientId.trim();
  const fromEnv = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
  return fromSettings || fromEnv || null;
}
