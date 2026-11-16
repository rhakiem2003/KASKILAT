/**
 * @file AppHeader.tsx
 * @description Header responsif with quiet local-save status and settings access.
 */

import React, { useState } from 'react';
import { Camera, Download, Settings, Smartphone, Tag } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { KasKilatMark, KasKilatWordmark } from '../brand/KasKilatLogo';
import { useInstallPrompt } from '../../lib/hooks/useInstallPrompt';

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
  const { canInstall, standalone, platform, install } = useInstallPrompt();
  const [showInstallHint, setShowInstallHint] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-3 sm:gap-4 lg:gap-8">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 shrink">
            <KasKilatMark className="w-9 h-9 shrink-0 drop-shadow-[0_2px_4px_rgba(5,150,102,0.3)]" />
            <div className="flex flex-col min-w-0">
              <KasKilatWordmark className="whitespace-nowrap" />
              <span className="text-[10px] text-slate-400 font-medium -mt-1 hidden sm:inline">
                UMKM + Personal
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-4 lg:gap-6 text-sm font-semibold text-slate-600 dark:text-slate-300">
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

          <div className="flex items-center gap-1 sm:gap-2.5 min-w-0 shrink">
            <button
              type="button"
              onClick={onOpenSettings}
              title="Data tersimpan di perangkat. Buka untuk mengatur backup."
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800"
            >
              <Smartphone className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Tersimpan lokal</span>
              <span className="sm:hidden">Lokal</span>
            </button>

            {!standalone && (
              <button
                type="button"
                onClick={() => {
                  if (canInstall) void install();
                  else setShowInstallHint(true);
                }}
                className="flex md:hidden lg:flex items-center justify-center gap-1.5 px-2 sm:px-2.5 h-9 shrink-0 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700"
                title="Install KasKilat sebagai aplikasi"
                aria-label="Install KasKilat sebagai aplikasi"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden min-[360px]:inline lg:hidden">Pasang</span>
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
              className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Pengaturan"
            >
              <Settings className="w-4 h-4" />
            </button>

            <Button
              size="sm"
              variant="primary"
              onClick={onAddClick}
              leftIcon={<Camera className="w-4 h-4" />}
              className="shadow-sm font-bold shrink-0 max-sm:hidden"
            >
              + Catat
            </Button>
          </div>
        </div>
      </header>

      <Modal
        isOpen={showInstallHint}
        onClose={() => setShowInstallHint(false)}
        title="Pasang KasKilat"
        description="Jadikan KasKilat aplikasi di layar utama HP, tanpa Play Store atau App Store."
      >
        <ol className="space-y-3 text-sm text-slate-700 dark:text-slate-300 list-decimal list-inside">
          {platform === 'ios' && (
            <>
              <li>Buka KasKilat di browser Safari.</li>
              <li>Ketuk tombol <strong>Bagikan</strong> di bawah layar.</li>
              <li>Pilih <strong>Tambahkan ke Layar Utama</strong>, lalu ketuk <strong>Tambah</strong>.</li>
            </>
          )}
          {platform === 'android' && (
            <>
              <li>Buka KasKilat di browser Chrome.</li>
              <li>Ketuk menu <strong>titik tiga</strong> di kanan atas.</li>
              <li>Pilih <strong>Instal aplikasi</strong> atau <strong>Tambahkan ke Layar utama</strong>.</li>
            </>
          )}
          {platform === 'other' && (
            <>
              <li>Klik ikon <strong>instal</strong> di bilah alamat browser.</li>
              <li>Atau buka menu browser, lalu pilih <strong>Install KasKilat</strong> / <strong>Install app</strong>.</li>
            </>
          )}
        </ol>
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
          Kalau menu tidak muncul, buka kaskilat.vercel.app langsung dari Chrome atau Safari.
        </p>
      </Modal>
    </>
  );
};
