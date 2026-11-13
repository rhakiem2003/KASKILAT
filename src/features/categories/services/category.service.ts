/**
 * @file category.service.ts
 * @description Layanan CRUD Kategori kas masuk dan keluar (terhubung ke Supabase dengan fallback penyimpanan lokal).
 */

import { Category, CreateCategoryInput, UpdateCategoryInput } from '../types/category.type';
import { getSupabase } from '../../../lib/supabase-client';
import { APP_CONFIG, DEFAULT_CATEGORIES } from '../../../lib/constants';

const STORAGE_KEY = APP_CONFIG.STORAGE_KEYS.CATEGORIES;

/**
 * Mengambil daftar semua kategori
 */
export async function getCategories(): Promise<Category[]> {
  const supabase = getSupabase();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      if (data && data.length > 0) return data as Category[];
    } catch (err) {
      console.warn('[CategoryService] Gagal memuat dari Supabase, beralih ke lokal:', err);
    }
  }

  // Fallback ke localStorage
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved) as Category[];
    } catch {
      // Abaikan jika rusak
    }
  }

  // Jika belum ada, inisialisasi default
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CATEGORIES));
  return DEFAULT_CATEGORIES as Category[];
}

/**
 * Menyimpan kategori baru
 */
export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  const supabase = getSupabase();
  const newCat: Category = {
    id: `cat-${Date.now()}`,
    name: input.name,
    type: input.type,
    color: input.color,
    icon: input.icon,
    created_at: new Date().toISOString(),
  };

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([input])
        .select()
        .single();
      if (!error && data) return data as Category;
    } catch (err) {
      console.warn('[CategoryService] Gagal insert ke Supabase, simpan lokal:', err);
    }
  }

  // Simpan ke localStorage
  const categories = await getCategories();
  const updated = [...categories, newCat];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return newCat;
}

/**
 * Menghapus kategori
 */
export async function deleteCategory(id: string): Promise<boolean> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('categories').delete().eq('id', id);
    } catch (err) {
      console.warn('[CategoryService] Gagal hapus di Supabase:', err);
    }
  }

  const categories = await getCategories();
  const filtered = categories.filter((c) => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}
