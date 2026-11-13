/**
 * @file useCategories.ts
 * @description Hook React untuk membaca dan menambah kategori UMKM.
 */

import { useState, useEffect, useCallback } from 'react';
import { Category, CreateCategoryInput } from '../types/category.type';
import { getCategories, createCategory, deleteCategory } from '../services/category.service';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat kategori.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleAddCategory = async (input: CreateCategoryInput) => {
    try {
      const newCat = await createCategory(input);
      setCategories((prev) => [...prev, newCat]);
      return newCat;
    } catch (err) {
      throw err;
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      throw err;
    }
  };

  return {
    categories,
    isLoading,
    error,
    refreshCategories: loadCategories,
    addCategory: handleAddCategory,
    removeCategory: handleDeleteCategory,
  };
}
