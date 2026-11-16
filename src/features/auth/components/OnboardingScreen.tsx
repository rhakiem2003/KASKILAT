/**
 * @file OnboardingScreen.tsx
 * @description A quick first-run choice. KasKilat works immediately without an account.
 */

import React, { useState } from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { KasKilatMark, KasKilatWordmark } from '../../../components/brand/KasKilatLogo';
import { TEMPLATE_LABELS, type TemplateType } from '../../../lib/templates';
import { startAsGuest } from '../../database/services/database-store';

export const OnboardingScreen: React.FC = () => {
  const [template, setTemplate] = useState<TemplateType>('umkm');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await startAsGuest(template);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyiapkan penyimpanan lokal.');
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1.5">
          <KasKilatMark
            className="w-14 h-14 mx-auto drop-shadow-[0_8px_16px_rgba(5,150,105,0.28)]"
            label="KasKilat"
          />
          <h1 className="text-2xl"><KasKilatWordmark size="lg" /></h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Catat uang masuk dan keluar. Beres.
          </p>
        </div>

        <div className="space-y-2.5">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Kamu mau pakai untuk apa?
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Pilih yang paling dekat. Kategori bisa diubah kapan saja.
          </p>

          {(Object.keys(TEMPLATE_LABELS) as TemplateType[]).map((key) => {
            const label = TEMPLATE_LABELS[key];
            const active = template === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTemplate(key)}
                disabled={busy}
                aria-pressed={active}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all min-h-[72px] ${
                  active
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <span className="text-2xl shrink-0" aria-hidden="true">{label.emoji}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-slate-900 dark:text-slate-100">
                    {label.title}
                  </span>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                    {label.subtitle}
                  </span>
                </span>
                {active && (
                  <span className="ml-auto w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {error && (
          <p className="text-xs text-rose-600 dark:text-rose-400 text-center leading-relaxed">
            {error}
          </p>
        )}

        <div className="space-y-3">
          <Button
            variant="primary"
            className="w-full h-12 text-sm font-bold"
            onClick={handleStart}
            isLoading={busy}
            disabled={busy}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Mulai mencatat
          </Button>
          <div className="flex items-start gap-2 px-1 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span>
              Tanpa akun. Catatan tersimpan di perangkat ini. Kamu bisa membuat file cadangan
              kapan saja dan menyimpannya ke Google Drive sendiri.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
