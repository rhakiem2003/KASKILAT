/**
 * @file RecentTransactionsList.tsx
 * @description Menampilkan daftar 5 transaksi kas terakhir di dashboard.
 */

import React from 'react';
import { ArrowRight, Receipt } from 'lucide-react';
import { Transaction } from '../../transactions/types/transaction.type';
import { Category } from '../../categories/types/category.type';
import { TransactionCard } from '../../transactions/components/TransactionCard';
import { EmptyState } from '../../../components/ui/EmptyState';

interface RecentTransactionsListProps {
  transactions: Transaction[];
  categories: Category[];
  onViewAll: () => void;
  onSelectTransaction: (tx: Transaction) => void;
  onScanClick: () => void;
  onPhotoClick: (url: string) => void;
}

export const RecentTransactionsList: React.FC<RecentTransactionsListProps> = ({
  transactions,
  categories,
  onViewAll,
  onSelectTransaction,
  onScanClick,
  onPhotoClick,
}) => {
  const recentFive = transactions.slice(0, 5);

  const getCategory = (catId?: string) => {
    return categories.find((c) => c.id === catId);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            5 Transaksi Terakhir
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Catatan kas masuk dan kas keluar terbaru
          </p>
        </div>

        {transactions.length > 0 && (
          <button
            type="button"
            onClick={onViewAll}
            className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            <span>Semua Transaksi</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {recentFive.length === 0 ? (
        <EmptyState
          icon={<Receipt className="w-6 h-6 text-slate-400" />}
          title="Belum Ada Transaksi"
          description="Foto struk belanja, nota warung, atau bukti transfer pertama Anda untuk mulai mencatat kas."
          actionLabel="+ Foto Struk Sekarang"
          onAction={onScanClick}
        />
      ) : (
        <div className="space-y-2">
          {recentFive.map((tx) => (
            <TransactionCard
              key={tx.id}
              transaction={tx}
              category={getCategory(tx.category_id)}
              onClick={() => onSelectTransaction(tx)}
              onPhotoClick={onPhotoClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};
