/**
 * @file ReportView.tsx
 * @description Halaman laporan rekap kas harian, mingguan, dan bulanan dengan fitur ekspor Excel & PDF.
 */

import React, { useState, useMemo } from 'react';
import { Download, Printer, ArrowDownLeft, ArrowUpRight, PieChart } from 'lucide-react';
import { Transaction } from '../../transactions/types/transaction.type';
import { Category } from '../../categories/types/category.type';
import { Button } from '../../../components/ui/Button';
import { formatRupiah } from '../../transactions/utils/formatRupiah';
import { exportTransactionsToCSV, triggerPrintReport } from '../utils/reportExporter';
import { formatIndonesianDate } from '../../transactions/utils/dateFormatter';

interface ReportViewProps {
  transactions: Transaction[];
  categories: Category[];
}

type PeriodType = 'today' | 'week' | 'month' | 'all';

export const ReportView: React.FC<ReportViewProps> = ({ transactions, categories }) => {
  const [period, setPeriod] = useState<PeriodType>('month');

  // Filter transaksi berdasarkan periode
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (period === 'today') {
      return transactions.filter((t) => t.transaction_date === todayStr);
    }

    if (period === 'week') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      const limitStr = sevenDaysAgo.toISOString().split('T')[0];
      return transactions.filter((t) => t.transaction_date >= limitStr);
    }

    if (period === 'month') {
      const monthPrefix = todayStr.substring(0, 7); // YYYY-MM
      return transactions.filter((t) => t.transaction_date.startsWith(monthPrefix));
    }

    return transactions;
  }, [transactions, period]);

  // Agregasi Laporan
  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    const catMap: Record<string, number> = {};

    for (const t of filteredTransactions) {
      if (t.type === 'in') {
        income += t.amount;
      } else {
        expense += t.amount;
        if (t.category_id) {
          catMap[t.category_id] = (catMap[t.category_id] || 0) + t.amount;
        }
      }
    }

    // Urutkan kategori pengeluaran terbesar
    const categoryBreakdown = Object.entries(catMap)
      .map(([catId, amount]) => {
        const cat = categories.find((c) => c.id === catId);
        return {
          id: catId,
          name: cat?.name || 'Lain-lain',
          color: cat?.color || '#94a3b8',
          amount,
          percentage: expense > 0 ? Math.round((amount / expense) * 100) : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    return {
      income,
      expense,
      net: income - expense,
      count: filteredTransactions.length,
      categoryBreakdown,
    };
  }, [filteredTransactions, categories]);

  const handleExportCSV = () => {
    exportTransactionsToCSV(filteredTransactions, categories, `Laporan_Kas_${period}`);
  };

  return (
    <div className="space-y-5 print:p-0">
      {/* Header & Periode selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
            Laporan Keuangan Kas
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Rekap kas masuk, kas keluar, dan laba operasional UMKM
          </p>
        </div>

        {/* Action Buttons: Export & Cetak */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={triggerPrintReport}
            leftIcon={<Printer className="w-3.5 h-3.5" />}
          >
            Cetak / PDF
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={handleExportCSV}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export Excel (.csv)
          </Button>
        </div>
      </div>

      {/* Segmented Periode Tabs */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit print:hidden">
        <button
          type="button"
          onClick={() => setPeriod('today')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            period === 'today'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Hari Ini
        </button>
        <button
          type="button"
          onClick={() => setPeriod('week')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            period === 'week'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          7 Hari Terakhir
        </button>
        <button
          type="button"
          onClick={() => setPeriod('month')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            period === 'month'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Bulan Berjalan
        </button>
        <button
          type="button"
          onClick={() => setPeriod('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            period === 'all'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Semua Periode
        </button>
      </div>

      {/* KPI Ringkasan Periode */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm/50">
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold mb-1">
            <ArrowDownLeft className="w-4 h-4" />
            <span>Total Penerimaan (Masuk)</span>
          </div>
          <p className="text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {formatRupiah(stats.income)}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm/50">
          <div className="flex items-center gap-1.5 text-xs text-rose-600 font-semibold mb-1">
            <ArrowUpRight className="w-4 h-4" />
            <span>Total Pengeluaran (Keluar)</span>
          </div>
          <p className="text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {formatRupiah(stats.expense)}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-sm">
          <div className="text-xs text-slate-400 font-semibold mb-1">
            Surplus Kas Bersih (Laba/Rugi)
          </div>
          <p className={`text-xl font-bold tabular-nums ${stats.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {stats.net >= 0 ? '+' : ''}{formatRupiah(stats.net)}
          </p>
        </div>
      </div>

      {/* Rincian Pos Pengeluaran per Kategori */}
      {stats.categoryBreakdown.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm/50 space-y-3">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Pos Pengeluaran Terbesar ({period})
            </h3>
          </div>

          <div className="space-y-2.5">
            {stats.categoryBreakdown.map((cat) => (
              <div key={cat.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {cat.name}
                    </span>
                  </div>
                  <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {formatRupiah(cat.amount)} ({cat.percentage}%)
                  </span>
                </div>
                {/* Bar persentase */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${cat.percentage}%`,
                      backgroundColor: cat.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabel Ringkasan Transaksi Periode Ini */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm/50">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
            Rincian {filteredTransactions.length} Transaksi Pada Periode Ini
          </h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-100 dark:border-slate-800 font-semibold">
              <tr>
                <th className="py-2.5 px-4">Tanggal</th>
                <th className="py-2.5 px-4">Toko / Keterangan</th>
                <th className="py-2.5 px-4">Tipe</th>
                <th className="py-2.5 px-4 text-right">Nominal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                    {formatIndonesianDate(tx.transaction_date)}
                  </td>
                  <td className="py-2.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                    {tx.merchant || tx.description || '-'}
                  </td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`font-semibold ${
                        tx.type === 'in' ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {tx.type === 'in' ? 'Masuk' : 'Keluar'}
                    </span>
                  </td>
                  <td
                    className={`py-2.5 px-4 text-right font-bold tabular-nums whitespace-nowrap ${
                      tx.type === 'in' ? 'text-emerald-600' : 'text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    {tx.type === 'in' ? '+' : '-'}{formatRupiah(tx.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
