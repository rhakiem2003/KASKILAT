/**
 * @file CategoryListModal.tsx
 * @description Modal manajemen Kategori Kas Masuk dan Kas Keluar untuk UMKM.
 */

import React, { useState } from 'react';
import { Plus, Trash2, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Category, CategoryType } from '../types/category.type';

interface CategoryListModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onAddCategory: (input: { name: string; type: CategoryType; color: string; icon: string }) => Promise<unknown>;
  onDeleteCategory: (id: string) => Promise<unknown>;
}

const COLOR_PRESETS = [
  '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6',
  '#ec4899', '#ef4444', '#f97316', '#eab308',
];

export const CategoryListModal: React.FC<CategoryListModalProps> = ({
  isOpen,
  onClose,
  categories,
  onAddCategory,
  onDeleteCategory,
}) => {
  const [activeTab, setActiveTab] = useState<CategoryType>('out');
  const [newCatName, setNewCatName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtered = categories.filter((c) => c.type === activeTab);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setIsSubmitting(true);
    try {
      await onAddCategory({
        name: newCatName.trim(),
        type: activeTab,
        color: selectedColor,
        icon: 'Tag',
      });
      setNewCatName('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Kelola Kategori Kas"
      description="Atur pos kas masuk dan kas keluar usaha Anda"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Tab Masuk vs Keluar */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('in')}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'in'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            Kas Masuk ({categories.filter((c) => c.type === 'in').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('out')}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'out'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Kas Keluar ({categories.filter((c) => c.type === 'out').length})
          </button>
        </div>

        {/* Form Tambah Kategori Baru */}
        <form onSubmit={handleCreate} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2.5">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
            Tambah Kategori Baru ({activeTab === 'in' ? 'Masuk' : 'Keluar'})
          </span>

          <div className="flex gap-2">
            <Input
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Nama kategori baru..."
              className="h-10 text-xs"
              required
            />
            <Button
              type="submit"
              size="sm"
              isLoading={isSubmitting}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              className="h-10 px-3 shrink-0"
            >
              Tambah
            </Button>
          </div>

          {/* Color palette selector */}
          <div className="flex items-center gap-1.5 pt-1">
            <span className="text-[11px] text-slate-400 mr-1">Warna:</span>
            {COLOR_PRESETS.map((col) => (
              <button
                key={col}
                type="button"
                onClick={() => setSelectedColor(col)}
                className={`w-5 h-5 rounded-full transition-transform ${
                  selectedColor === col ? 'ring-2 ring-offset-2 ring-slate-800 scale-110' : ''
                }`}
                style={{ backgroundColor: col }}
              />
            ))}
          </div>
        </form>

        {/* Daftar Kategori Aktif */}
        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
          {filtered.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {cat.name}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onDeleteCategory(cat.id)}
                className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                title="Hapus kategori"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};
