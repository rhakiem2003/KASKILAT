/**
 * @file BalanceSummaryCard.tsx
 * @description Kartu ringkasan saldo kas utama, kas masuk, dan kas keluar bulan ini.
 */

import React from 'react';
import { ArrowDownLeft, ArrowUpRight, Wallet, TrendingUp } from 'lucide-react';
import { TransactionSummary } from '../../transactions/types/transaction.type';
import { formatRupiah } from '../../transactions/utils/formatRupiah';

interface BalanceSummaryCardProps {
  summary: TransactionSummary;
  onScanClick: () => void;
}

export const BalanceSummaryCard: React.FC<BalanceSummaryCardProps> = ({
  summary,
  onScanClick,
}) => {
  const netProfitMonth = summary.totalIncomeMonth - summary.totalExpenseMonth;

  return (
    <div className="w-full space-y-3">
      {/* Kartu Saldo Utama */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-5 sm:p-6 shadow-lg shadow-slate-900/10">
        {/* Latar dekoratif minimalis */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span>Total Saldo Kas Usaha</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums text-white">
              {formatRupiah(summary.totalBalance)}
            </h2>
            <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <TrendingUp className="w-3.5 h-3.5" />
                Arus Kas Bulan Ini:
              </span>
              <span className={`font-semibold tabular-nums ${netProfitMonth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {netProfitMonth >= 0 ? '+' : ''}{formatRupiah(netProfitMonth)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onScanClick}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-md shadow-emerald-500/25 active:scale-[0.98] transition-all shrink-0 min-h-[48px]"
          >
            <span>+ Foto Struk Kas</span>
          </button>
        </div>
      </div>

      {/* 2 Kolom Ringkasan: Kas Masuk & Kas Keluar Bulan Ini */}
      <div className="grid grid-cols-2 gap-3">
        {/* Kas Masuk */}
        <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40">
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold mb-1">
            <ArrowDownLeft className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Kas Masuk (Bulan Ini)</span>
          </div>
          <p className="text-lg sm:text-xl font-bold tabular-nums text-emerald-800 dark:text-emerald-300">
            {formatRupiah(summary.totalIncomeMonth)}
          </p>
        </div>

        {/* Kas Keluar */}
        <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40">
          <div className="flex items-center gap-1.5 text-xs text-rose-700 dark:text-rose-400 font-semibold mb-1">
            <ArrowUpRight className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Kas Keluar (Bulan Ini)</span>
          </div>
          <p className="text-lg sm:text-xl font-bold tabular-nums text-rose-800 dark:text-rose-300">
            {formatRupiah(summary.totalExpenseMonth)}
          </p>
        </div>
      </div>
    </div>
  );
};
