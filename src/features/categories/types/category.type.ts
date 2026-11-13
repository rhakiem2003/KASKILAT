/**
 * @file category.type.ts
 * @description Tipe data TypeScript untuk entitas Kategori (Kas Masuk / Keluar)
 */

export type CategoryType = 'in' | 'out';

export interface Category {
  id: string;
  user_id?: string | null;
  name: string;
  type: CategoryType;
  color: string;
  icon: string;
  created_at?: string;
}

export interface CreateCategoryInput {
  name: string;
  type: CategoryType;
  color: string;
  icon: string;
}

export interface UpdateCategoryInput extends Partial<CreateCategoryInput> {
  id: string;
}
