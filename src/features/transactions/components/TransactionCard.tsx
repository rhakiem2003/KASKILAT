/**
 * @file TransactionCard.tsx
 * @description Komponen kartu baris transaksi dengan tampilan thumbnail foto struk dan indikator kas in/out.
 */

import React from 'react';
import { ArrowDownLeft, ArrowUpRight, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Transaction } from '../types/transaction.type';
import { Category } from '../../categories/types/category.type';
import { formatRupiah } from '../utils/formatRupiah';
import { formatIndonesianDate } from '../utils/dateFormatter';
import { usePhotoUrl } from '../../storage/hooks/usePhotoUrl';

interface TransactionCardProps {
  transaction: Transaction;
  category?: Category;
  onClick?: () => void;
  onPhotoClick?: (photoUrl: string) => void;
}

export const TransactionCard: React.FC<TransactionCardProps> = ({
  transaction,
  category,
  onClick,
  onPhotoClick,
}) => {
  const isIncome = transaction.type === 'in';
  const { url: photoUrl, isLoading: isPhotoLoading } = usePhotoUrl(transaction.photo_url);

  return (
    <div
      onClick={onClick}
      className="group flex items-center justify-between p-3.5 sm:p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer min-h-[64px]"
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Indikator tipe & Icon Kategori */}
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isIncome
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
          }`}
        >
          {isIncome ? (
            <ArrowDownLeft className="w-5 h-5" />
          ) : (
            <ArrowUpRight className="w-5 h-5" />
          )}
        </div>

        {/* Info Merchant, Kategori, Tanggal */}
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
            {transaction.merchant || transaction.description || 'Transaksi Tanpa Nama'}
          </p>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            <span>{category?.name || (isIncome ? 'Kas Masuk' : 'Kas Keluar')}</span>
            <span>·</span>
            <span>{formatIndonesianDate(transaction.transaction_date)}</span>
            <span>·</span>
            <span>{transaction.payment_method}</span>
          </div>
        </div>
      </div>

      {/* Bagian Kanan: Thumbnail foto struk & Nominal Rupiah */}
      <div className="flex items-center gap-2.5 shrink-0 pl-2">
        {transaction.photo_url && (
          <button
            type="button"
            title={photoUrl ? 'Lihat foto struk' : 'Foto tersimpan di Google Drive — hubungkan untuk melihat'}
            onClick={(e) => {
              e.stopPropagation();
              if (photoUrl) onPhotoClick?.(photoUrl);
            }}
            disabled={!photoUrl}
            className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 flex items-center justify-center hover:opacity-80 transition-opacity disabled:cursor-default"
          >
            {photoUrl ? (
              <img
                src={photoUrl}
                alt="Bukti Struk"
                className="w-full h-full object-cover"
              />
            ) : isPhotoLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
            ) : (
              <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>
        )}

        <div className="text-right">
          <p
            className={`text-xs sm:text-sm font-bold tabular-nums ${
              isIncome
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-900 dark:text-slate-100'
            }`}
          >
            {isIncome ? '+' : '-'}{formatRupiah(transaction.amount)}
          </p>
          {transaction.ocr_confidence ? (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
              OCR {transaction.ocr_confidence}%
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
};
