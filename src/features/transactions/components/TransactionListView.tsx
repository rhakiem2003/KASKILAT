/**
 * @file TransactionListView.tsx
 * @description Tampilan daftar seluruh transaksi dengan filter tipe (masuk/keluar), tanggal, dan pencarian.
 */

import React, { useState, useMemo } from 'react';
import { Search, Filter, Plus, ArrowDownLeft, ArrowUpRight, Receipt } from 'lucide-react';
import { Transaction, TransactionType } from '../types/transaction.type';
import { Category } from '../../categories/types/category.type';
import { TransactionCard } from './TransactionCard';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { EmptyState } from '../../../components/ui/EmptyState';
import { formatRupiah } from '../utils/formatRupiah';

interface TransactionListViewProps {
  transactions: Transaction[];
  categories: Category[];
  onSelectTransaction: (tx: Transaction) => void;
  onScanClick: () => void;
  onPhotoClick: (url: string) => void;
}

export const TransactionListView: React.FC<TransactionListViewProps> = ({
  transactions,
  categories,
  onSelectTransaction,
  onScanClick,
  onPhotoClick,
}) => {
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredList = useMemo(() => {
    return transactions.filter((tx) => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (selectedCategory !== 'all' && tx.category_id !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesMerchant = tx.merchant?.toLowerCase().includes(q);
        const matchesDesc = tx.description?.toLowerCase().includes(q);
        const matchesAmount = tx.amount.toString().includes(q);
        if (!matchesMerchant && !matchesDesc && !matchesAmount) return false;
      }
      return true;
    });
  }, [transactions, typeFilter, selectedCategory, searchQuery]);

  // Total filtered
  const filteredTotal = useMemo(() => {
    return filteredList.reduce((acc, t) => (t.type === 'in' ? acc + t.amount : acc - t.amount), 0);
  }, [filteredList]);

  return (
    <div className="space-y-4">
      {/* Header bar transaksi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
            Riwayat Transaksi Kas
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Daftar seluruh kas masuk dan kas keluar usaha
          </p>
        </div>

        <Button
          onClick={onScanClick}
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          size="sm"
        >
          + Foto Struk Baru
        </Button>
      </div>

      {/* Filter Tabs: Semua / Masuk / Keluar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              typeFilter === 'all'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Semua ({transactions.length})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('in')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
              typeFilter === 'in'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            Masuk ({transactions.filter((t) => t.type === 'in').length})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('out')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
              typeFilter === 'out'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Keluar ({transactions.filter((t) => t.type === 'out').length})
          </button>
        </div>

        {/* Dropdown Kategori */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300"
        >
          <option value="all">Semua Kategori</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.type === 'in' ? 'Masuk' : 'Keluar'})
            </option>
          ))}
        </select>
      </div>

      {/* Input Pencarian */}
      <Input
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Cari toko, keterangan, atau nominal..."
        leftPrefix={<Search className="w-4 h-4" />}
        className="h-10 text-xs"
      />

      {/* Ringkasan Filter Aktif */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>Menampilkan {filteredList.length} transaksi</span>
        <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">
          Total Kas Bersih: {formatRupiah(filteredTotal)}
        </span>
      </div>

      {/* List Kartu Transaksi */}
      {filteredList.length === 0 ? (
        <EmptyState
          icon={<Receipt className="w-6 h-6 text-slate-400" />}
          title="Tidak Ada Transaksi yang Cocok"
          description={
            searchQuery
              ? `Tidak ditemukan transaksi dengan kata kunci "${searchQuery}".`
              : 'Belum ada transaksi pada kategori ini.'
          }
          actionLabel="+ Catat Transaksi Baru"
          onAction={onScanClick}
        />
      ) : (
        <div className="space-y-2">
          {filteredList.map((tx) => (
            <TransactionCard
              key={tx.id}
              transaction={tx}
              category={categories.find((c) => c.id === tx.category_id)}
              onClick={() => onSelectTransaction(tx)}
              onPhotoClick={onPhotoClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};
