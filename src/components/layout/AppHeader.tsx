/**
 * @file AppHeader.tsx
 * @description Header responsif: brand, navigasi, status backup, install PWA, dan tombol catat.
 */

import React, { useState } from 'react';
import {
  Camera,
  Cloud,
  CloudOff,
  Download,
  Loader2,
  LogOut,
  Settings,
  Smartphone,
  Tag,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { KasKilatMark, KasKilatWordmark } from '../brand/KasKilatLogo';
import { useAppDatabase } from '../../features/database/hooks/useAppDatabase';
import { useInstallPrompt } from '../../lib/hooks/useInstallPrompt';
import { formatSyncTimestamp } from '../../features/transactions/utils/dateFormatter';
import { logout, startWithGoogle } from '../../features/database/services/database-store';
import { showToast } from '../../lib/toast';

interface AppHeaderProps {
  activeTab: 'dashboard' | 'transactions' | 'reports';
  onTabChange: (tab: 'dashboard' | 'transactions' | 'reports') => void;
  onAddClick: () => void;
  onOpenCategories: () => void;
  onOpenSettings: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  activeTab,
  onTabChange,
  onAddClick,
  onOpenCategories,
  onOpenSettings,
}) => {
  const { mode, email, sync } = useAppDatabase();
  const { canInstall, install } = useInstallPrompt();
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);

  const isGuest = mode === 'guest';

  const handleBackupLogin = async () => {
    if (loginBusy) return;
    setLoginBusy(true);
    try {
      await startWithGoogle();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Login Google dibatalkan.',
        'error'
      );
    } finally {
      setLoginBusy(false);
    }
  };

  const handleLogout = async () => {
    if (!window.confirm('Keluar dari Google? Data di Drive tetap aman dan tidak dihapus.')) return;
    setLogoutBusy(true);
    try {
      await logout();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Gagal keluar dari akun Google.',
        'error'
      );
    } finally {
      setLogoutBusy(false);
    }
  };

  const syncText = isGuest
    ? loginBusy
      ? 'Menghubungkan...'
      : 'Login to Backup'
    : sync.phase === 'saving' || sync.phase === 'syncing'
      ? 'Menyimpan...'
      : sync.phase === 'synced'
        ? sync.lastSyncedAt
          ? `Last synced: ${formatSyncTimestamp(sync.lastSyncedAt)}`
          : 'Tersimpan di Drive'
        : sync.phase === 'offline'
          ? 'Offline - tersimpan lokal'
          : 'Tersimpan lokal';

  const SyncIcon = isGuest
    ? loginBusy
      ? Loader2
      : Smartphone
    : sync.phase === 'offline'
      ? CloudOff
      : sync.phase === 'saving' || sync.phase === 'syncing'
        ? Loader2
        : Cloud;

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-3 sm:gap-8">
        {/* Brand */}
        <div className="flex items-center gap-2.5 shrink-0">
          <KasKilatMark className="w-9 h-9 shrink-0 drop-shadow-[0_2px_4px_rgba(5,150,105,0.3)]" />
          <div className="flex flex-col min-w-0">
            <KasKilatWordmark className="whitespace-nowrap" />
            {isGuest ? (
              <span className="text-[10px] text-slate-400 font-medium -mt-1 hidden sm:inline">
                UMKM + Personal
              </span>
            ) : (
              <span
                className="text-[10px] font-semibold -mt-1 truncate max-w-[7.5rem] sm:max-w-[16rem] text-emerald-600 dark:text-emerald-400"
                title={`Connected as ${email}`}
              >
                Connected as {email}
              </span>
            )}
          </div>
        </div>

        {/* Navigasi desktop */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600 dark:text-slate-300">
          {([
            ['dashboard', 'Dashboard'],
            ['transactions', 'Buku Transaksi'],
            ['reports', 'Laporan Keuangan'],
          ] as const).map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              onClick={() => onTabChange(tab)}
              className={`transition-colors whitespace-nowrap shrink-0 hover:text-emerald-600 ${
                activeTab === tab
                  ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 py-1'
                  : ''
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* Status & aksi */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={isGuest ? handleBackupLogin : onOpenSettings}
            disabled={loginBusy}
            title={isGuest ? 'Login dengan Google untuk backup' : email ?? 'Status backup'}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors max-w-[9.5rem] sm:max-w-none disabled:opacity-70 ${
              isGuest
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                : sync.phase === 'offline'
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
            }`}
          >
            <SyncIcon
              className={`w-3.5 h-3.5 shrink-0 ${
                loginBusy || sync.phase === 'saving' || sync.phase === 'syncing'
                  ? 'animate-spin'
                  : ''
              }`}
            />
            <span className="truncate">{syncText}</span>
          </button>

          {canInstall && (
            <button
              type="button"
              onClick={install}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700"
              title="Install KasKilat sebagai aplikasi"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Install App</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenCategories}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Kelola Kategori"
          >
            <Tag className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Kategori</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Pengaturan"
          >
            <Settings className="w-4 h-4" />
          </button>

          {!isGuest && (
            <button
              type="button"
              onClick={handleLogout}
              disabled={logoutBusy}
              className="hidden md:flex items-center gap-1.5 px-2.5 h-9 rounded-xl text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-50"
              title="Logout dari akun Google"
            >
              {logoutBusy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogOut className="w-3.5 h-3.5" />
              )}
              <span className="hidden lg:inline">Logout</span>
            </button>
          )}

          <Button
            size="sm"
            variant="primary"
            onClick={onAddClick}
            leftIcon={<Camera className="w-4 h-4" />}
            className="shadow-sm font-bold shrink-0"
          >
            <span className="hidden sm:inline">+ Catat</span>
            <span className="sm:hidden">+</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
