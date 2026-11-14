/**
 * @file category.service.ts
 * @description Layanan kategori yang diteruskan ke database-store (IndexedDB + Drive).
 */

import type {
  Category,
  CreateCategoryInput,
} from '../types/category.type';
import {
  addCategory,
  deleteCategory as removeCategory,
  getSnapshot,
} from '../../database/services/database-store';

export async function getCategories(): Promise<Category[]> {
  const database = getSnapshot().database;
  if (!database) return [];
  return [...database.categories].sort((a, b) => a.name.localeCompare(b.name));
}

export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  return addCategory(input);
}

export async function deleteCategory(id: string): Promise<boolean> {
  await removeCategory(id);
  return true;
}
