/**
 * @file templates.ts
 * @description Template kategori awal untuk UMKM dan pribadi, serta pembuat database kosong.
 */

import { Category } from '../features/categories/types/category.type';
import { KasKilatDatabase } from '../features/database/types/database.type';

export type TemplateType = 'umkm' | 'personal';

export const TEMPLATE_LABELS: Record<TemplateType, { title: string; subtitle: string; emoji: string }> = {
  umkm: {
    title: 'UMKM / Usaha',
    subtitle: 'Penjualan, stok, operasional, gaji',
    emoji: '🏪',
  },
  personal: {
    title: 'Pribadi / Personal',
    subtitle: 'Gaji, makan, transport, tabungan',
    emoji: '👤',
  },
};

type CategorySeed = {
  key: string;
  name: string;
  type: 'in' | 'out';
  color: string;
  icon: string;
};

const UMKM_SEEDS: CategorySeed[] = [
  { key: 'in-1', name: 'Penjualan Produk', type: 'in', color: '#10b981', icon: 'ShoppingBag' },
  { key: 'in-2', name: 'Jasa & Layanan', type: 'in', color: '#06b6d4', icon: 'Wrench' },
  { key: 'in-3', name: 'Penerimaan Piutang', type: 'in', color: '#3b82f6', icon: 'ArrowDownLeft' },
  { key: 'in-4', name: 'Pendapatan Lain', type: 'in', color: '#8b5cf6', icon: 'Coins' },
  { key: 'out-1', name: 'Beli Stok & Bahan Baku', type: 'out', color: '#ef4444', icon: 'Package' },
  { key: 'out-2', name: 'Operasional & Listrik', type: 'out', color: '#f97316', icon: 'Zap' },
  { key: 'out-3', name: 'Gaji & Upah Karyawan', type: 'out', color: '#ec4899', icon: 'Users' },
  { key: 'out-4', name: 'Sewa Tempat & Toko', type: 'out', color: '#6366f1', icon: 'Home' },
  { key: 'out-5', name: 'Biaya Transport & Kirim', type: 'out', color: '#14b8a6', icon: 'Truck' },
  { key: 'out-6', name: 'Makan & Minum Usaha', type: 'out', color: '#eab308', icon: 'Utensils' },
];

const PERSONAL_SEEDS: CategorySeed[] = [
  { key: 'in-1', name: 'Gaji', type: 'in', color: '#10b981', icon: 'Wallet' },
  { key: 'in-2', name: 'Bonus / THR', type: 'in', color: '#06b6d4', icon: 'Gift' },
  { key: 'in-3', name: 'Usaha Sampingan', type: 'in', color: '#3b82f6', icon: 'Store' },
  { key: 'out-1', name: 'Makan & Minum', type: 'out', color: '#ef4444', icon: 'Utensils' },
  { key: 'out-2', name: 'Transport / Bensin', type: 'out', color: '#f97316', icon: 'Car' },
  { key: 'out-3', name: 'Belanja Harian', type: 'out', color: '#ec4899', icon: 'ShoppingBag' },
  { key: 'out-4', name: 'Pulsa & Internet', type: 'out', color: '#8b5cf6', icon: 'Smartphone' },
  { key: 'out-5', name: 'Listrik & Air', type: 'out', color: '#6366f1', icon: 'Zap' },
  { key: 'out-6', name: 'Hiburan', type: 'out', color: '#14b8a6', icon: 'Gamepad2' },
  { key: 'out-7', name: 'Kesehatan', type: 'out', color: '#0ea5e9', icon: 'HeartPulse' },
  { key: 'out-8', name: 'Tabungan', type: 'out', color: '#eab308', icon: 'PiggyBank' },
];

const SEEDS: Record<TemplateType, CategorySeed[]> = {
  umkm: UMKM_SEEDS,
  personal: PERSONAL_SEEDS,
};

export function createTemplateCategories(
  template: TemplateType,
  createdAt = new Date().toISOString()
): Category[] {
  return SEEDS[template].map((seed) => ({
    id: `${template}-cat-${seed.key}`,
    name: seed.name,
    type: seed.type,
    color: seed.color,
    icon: seed.icon,
    created_at: createdAt,
  }));
}

export function createEmptyDatabase(template: TemplateType): KasKilatDatabase {
  const now = new Date().toISOString();
  return {
    version: 1,
    transactions: [],
    categories: createTemplateCategories(template, now),
    lastUpdated: now,
    template,
  };
}

export function isTemplateType(value: unknown): value is TemplateType {
  return value === 'umkm' || value === 'personal';
}
