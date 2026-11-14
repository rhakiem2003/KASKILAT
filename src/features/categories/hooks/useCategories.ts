/**
 * @file useCategories.ts
 * @description Hook React untuk kategori dari database-store (selalu sinkron dengan UI).
 */

import { useMemo } from 'react';
import type { Category, CreateCategoryInput } from '../types/category.type';
import { useAppDatabase } from '../../database/hooks/useAppDatabase';
import {
  addCategory,
  deleteCategory,
} from '../../database/services/database-store';

export function useCategories() {
  const { database, status } = useAppDatabase();

  const categories = useMemo<Category[]>(() => {
    if (!database) return [];
    return [...database.categories].sort((a, b) => a.name.localeCompare(b.name));
  }, [database]);

  const handleAddCategory = async (input: CreateCategoryInput) => addCategory(input);
  const handleDeleteCategory = async (id: string) => {
    await deleteCategory(id);
  };

  return {
    categories,
    isLoading: status === 'loading',
    error: null,
    refreshCategories: () => undefined,
    addCategory: handleAddCategory,
    removeCategory: handleDeleteCategory,
  };
}
