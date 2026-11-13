/**
 * @file supabase-client.ts
 * @description Inisialisasi client Supabase dengan deteksi otomatis dan fallback offline storage.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project.supabase.co' &&
  !supabaseUrl.includes('placeholder')
);

let supabaseInstance: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  } catch (err) {
    console.warn('[Supabase] Gagal inisialisasi client, beralih ke penyimpanan lokal:', err);
  }
}

/**
 * Mendapatkan instance Supabase client (atau null jika dalam mode lokal/offline)
 */
export function getSupabase(): SupabaseClient | null {
  return supabaseInstance;
}

/**
 * Informasi status koneksi backend
 */
export function getBackendConnectionStatus(): {
  isConfigured: boolean;
  type: 'supabase' | 'local_indexed';
  url?: string;
} {
  return {
    isConfigured: isSupabaseConfigured,
    type: isSupabaseConfigured ? 'supabase' : 'local_indexed',
    url: isSupabaseConfigured ? supabaseUrl : undefined,
  };
}
