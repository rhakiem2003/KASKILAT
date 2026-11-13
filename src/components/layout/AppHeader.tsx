/**
 * @file AppHeader.tsx
 * @description Header navigasi desktop dan tablet yang mematuhi Top Bar Contract 3-zona.
 */

import React from 'react';
import { Camera, Database, Tag, BookOpen } from 'lucide-react';
import { Button } from '../ui/Button';
import { getBackendConnectionStatus } from '../../lib/supabase-client';

interface AppHeaderProps {
  activeTab: 'dashboard' | 'transactions' | 'reports';
  onTabChange: (tab: 'dashboard' | 'transactions' | 'reports') => void;
  onScanClick: () => void;
  onOpenCategories: () => void;
  onOpenBackendSettings: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  activeTab,
  onTabChange,
  onScanClick,
  onOpenCategories,
  onOpenBackendSettings,
}) => {
  const backendStatus = getBackendConnectionStatus();

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zona 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shadow-emerald-600/30">
            K
          </div>
          <div className="flex flex-col">
            <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
              KasKilat UMKM
            </span>
            <span className="text-[10px] text-slate-400 font-medium -mt-1 hidden sm:inline">
              Kas Masuk / Keluar Otomatis
            </span>
          </div>
        </div>

        {/* Zona 2: Navigasi Desktop & Tablet (Single line links) */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <button
            type="button"
            onClick={() => onTabChange('dashboard')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-emerald-600 ${
              activeTab === 'dashboard'
                ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 py-1'
                : ''
            }`}
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => onTabChange('transactions')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-emerald-600 ${
              activeTab === 'transactions'
                ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 py-1'
                : ''
            }`}
          >
            Buku Transaksi
          </button>
          <button
            type="button"
            onClick={() => onTabChange('reports')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-emerald-600 ${
              activeTab === 'reports'
                ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 py-1'
                : ''
            }`}
          >
            Laporan Keuangan
          </button>
        </nav>

        {/* Zona 3: Aksi Utama & Status */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenCategories}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Kelola Kategori"
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Kategori</span>
          </button>

          <button
            type="button"
            onClick={onOpenBackendSettings}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
              backendStatus.isConfigured
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
            title="Pengaturan Database"
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {backendStatus.isConfigured ? 'Supabase' : 'Offline'}
            </span>
          </button>

          <Button
            size="sm"
            variant="primary"
            onClick={onScanClick}
            leftIcon={<Camera className="w-4 h-4" />}
            className="shadow-sm font-bold"
          >
            + Foto Struk
          </Button>
        </div>
      </div>
    </header>
  );
};
