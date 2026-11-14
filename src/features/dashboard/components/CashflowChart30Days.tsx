/**
 * @file CashflowChart30Days.tsx
 * @description Visualisasi grafik arus kas harian (masuk vs keluar) selama 30 hari terakhir.
 */

import React, { useMemo, useState } from 'react';
import { Transaction } from '../../transactions/types/transaction.type';
import { formatRupiah } from '../../transactions/utils/formatRupiah';

interface CashflowChart30DaysProps {
  transactions: Transaction[];
}

interface DayData {
  dateStr: string; // YYYY-MM-DD
  dayNumber: string; // DD
  monthName: string; // Nov
  income: number;
  expense: number;
}

export const CashflowChart30Days: React.FC<CashflowChart30DaysProps> = ({ transactions }) => {
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null);

  // Hitung data 30 hari ke belakang dari hari ini
  const daysData = useMemo<DayData[]>(() => {
    const list: DayData[] = [];
    const today = new Date();

    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      const dayNum = String(d.getDate()).padStart(2, '0');
      const monthShort = d.toLocaleString('id-ID', { month: 'short' });

      list.push({
        dateStr: iso,
        dayNumber: dayNum,
        monthName: monthShort,
        income: 0,
        expense: 0,
      });
    }

    // Agregasikan transaksi
    for (const tx of transactions) {
      const target = list.find((day) => day.dateStr === tx.transaction_date);
      if (target) {
        if (tx.type === 'in') {
          target.income += tx.amount;
        } else {
          target.expense += tx.amount;
        }
      }
    }

    return list;
  }, [transactions]);

  // Cari nilai maksimum untuk normalisasi tinggi bar grafik
  const maxVal = useMemo(() => {
    const highest = Math.max(
      ...daysData.map((d) => Math.max(d.income, d.expense)),
      500000 // minimal baseline 500rb
    );
    return highest;
  }, [daysData]);

  return (
    <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm/50 space-y-3">
      {/* Header Grafik & Legenda */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Arus Kas 30 Hari Terakhir
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Perbandingan harian kas masuk dan keluar
          </p>
        </div>

        {/* Legenda */}
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
            <span>Kas Masuk</span>
          </div>
          <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
            <span>Kas Keluar</span>
          </div>
        </div>
      </div>

      {/* Info Tooltip Hover */}
      <div className="min-h-6 flex items-center text-xs">
        {hoveredDay ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 font-medium animate-in fade-in duration-100">
            <span className="text-slate-500">{hoveredDay.dayNumber} {hoveredDay.monthName}:</span>
            <span className="text-emerald-600 font-semibold">Masuk: {formatRupiah(hoveredDay.income)}</span>
            <span className="text-rose-600 font-semibold">Keluar: {formatRupiah(hoveredDay.expense)}</span>
          </div>
        ) : (
          <span className="text-slate-400 text-[11px]">
            Arahkan kursor atau sentuh bar untuk melihat rincian tanggal tertentu
          </span>
        )}
      </div>

      {/* Bar Grafik Canvas SVG */}
      <div className="relative pt-2 pb-1">
        <div className="h-36 flex items-end justify-between gap-px sm:gap-1 border-b border-slate-200 dark:border-slate-800">
          {daysData.map((d) => {
            const incomeHeight = Math.max(3, Math.round((d.income / maxVal) * 110));
            const expenseHeight = Math.max(3, Math.round((d.expense / maxVal) * 110));
            const hasData = d.income > 0 || d.expense > 0;

            return (
              <div
                key={d.dateStr}
                onMouseEnter={() => setHoveredDay(d)}
                onMouseLeave={() => setHoveredDay(null)}
                className="flex-1 min-w-0 flex flex-col items-center justify-end h-full group cursor-pointer"
              >
                <div className="flex items-end gap-px w-full justify-center">
                  {/* Bar Kas Masuk */}
                  <div
                    className={`flex-1 max-w-[8px] rounded-t-sm transition-all duration-200 ${
                      d.income > 0 ? 'bg-emerald-500 group-hover:bg-emerald-400' : 'bg-slate-100 dark:bg-slate-800'
                    }`}
                    style={{ height: `${d.income > 0 ? incomeHeight : 3}px` }}
                  />
                  {/* Bar Kas Keluar */}
                  <div
                    className={`flex-1 max-w-[8px] rounded-t-sm transition-all duration-200 ${
                      d.expense > 0 ? 'bg-rose-500 group-hover:bg-rose-400' : 'bg-slate-100 dark:bg-slate-800'
                    }`}
                    style={{ height: `${d.expense > 0 ? expenseHeight : 3}px` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Label Tanggal bawah */}
        <div className="flex justify-between text-[10px] text-slate-400 pt-1 font-mono">
          <span>{daysData[0]?.dayNumber} {daysData[0]?.monthName}</span>
          <span>{daysData[14]?.dayNumber} {daysData[14]?.monthName}</span>
          <span>Hari Ini ({daysData[29]?.dayNumber} {daysData[29]?.monthName})</span>
        </div>
      </div>
    </div>
  );
};
