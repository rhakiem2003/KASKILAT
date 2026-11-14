/**
 * @file BottomNavigation.tsx
 * @description Navigasi bawah ramah jempol (thumb-zone) untuk tampilan smartphone / mobile PWA.
 */

import React from 'react';
import { LayoutDashboard, ReceiptText, BarChart3, Tag, Plus } from 'lucide-react';

interface BottomNavigationProps {
  activeTab: 'dashboard' | 'transactions' | 'reports';
  onTabChange: (tab: 'dashboard' | 'transactions' | 'reports') => void;
  onAddClick: () => void;
  onOpenCategories: () => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabChange,
  onAddClick,
  onOpenCategories,
}) => {
  return (
    <nav
      aria-label="Navigasi Bawah Mobile"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 pb-safe"
    >
      <div className="grid grid-cols-5 items-center h-16 px-2 max-w-lg mx-auto">
        {/* Tab 1: Dashboard */}
        <button
          type="button"
          onClick={() => onTabChange('dashboard')}
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] transition-colors ${
            activeTab === 'dashboard'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-1">Beranda</span>
        </button>

        {/* Tab 2: Transaksi */}
        <button
          type="button"
          onClick={() => onTabChange('transactions')}
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] transition-colors ${
            activeTab === 'transactions'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <ReceiptText className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-1">Transaksi</span>
        </button>

        {/* Center: Action Button Kamera [+] */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={onAddClick}
            aria-label="Tambah Transaksi"
            className="w-12 h-12 -mt-4 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center active:scale-95 transition-transform"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Tab 3: Laporan */}
        <button
          type="button"
          onClick={() => onTabChange('reports')}
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] transition-colors ${
            activeTab === 'reports'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-1">Laporan</span>
        </button>

        {/* Tab 4: Kategori */}
        <button
          type="button"
          onClick={onOpenCategories}
          className="flex flex-col items-center justify-center min-h-[44px] min-w-[44px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <Tag className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-1">Kategori</span>
        </button>
      </div>
    </nav>
  );
};
