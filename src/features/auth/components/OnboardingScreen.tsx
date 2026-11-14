/**
 * @file OnboardingScreen.tsx
 * @description Layar pertama: pilih template pencatatan, lalu login Google atau lanjut sebagai tamu.
 */

import React, { useState } from 'react';
import { ArrowRight, Cloud, Loader2, ShieldCheck, Smartphone } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { TEMPLATE_LABELS, TemplateType } from '../../../lib/templates';
import { startAsGuest, startWithGoogle } from '../../database/services/database-store';
import { isGoogleConfigured } from '../services/auth.service';

export const OnboardingScreen: React.FC = () => {
  const [template, setTemplate] = useState<TemplateType | null>(null);
  const [busy, setBusy] = useState<'google' | 'guest' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const googleReady = isGoogleConfigured();

  const handleGuest = async () => {
    if (!template) {
      setError('Pilih dulu mau catat apa.');
      return;
    }
    setError(null);
    setBusy('guest');
    try {
      await startAsGuest(template);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyiapkan penyimpanan lokal.');
      setBusy(null);
    }
  };

  const handleGoogle = async () => {
    if (!template) {
      setError('Pilih dulu mau catat apa.');
      return;
    }
    setError(null);
    setBusy('google');
    try {
      await startWithGoogle(template);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login Google dibatalkan.');
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1.5">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-2xl font-extrabold shadow-lg shadow-emerald-600/25">
            K
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            KasKilat
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cashflow Tracker UMKM + Personal
          </p>
        </div>

        <div className="space-y-2.5">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Mau catat apa?
          </h2>

          {(Object.keys(TEMPLATE_LABELS) as TemplateType[]).map((key) => {
            const label = TEMPLATE_LABELS[key];
            const active = template === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setTemplate(key);
                  setError(null);
                }}
                disabled={busy !== null}
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

        <div className="space-y-2.5">
          <Button
            variant="primary"
            className="w-full h-12 text-sm font-bold"
            onClick={handleGoogle}
            isLoading={busy === 'google'}
            disabled={busy !== null || !googleReady}
            leftIcon={
              busy === 'google' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Cloud className="w-4 h-4" />
              )
            }
          >
            Login with Google
          </Button>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
            Backup otomatis ke Google Drive kamu sendiri. Bisa dibuka di HP lain.
          </p>

          <Button
            variant="outline"
            className="w-full h-12 text-sm font-bold"
            onClick={handleGuest}
            isLoading={busy === 'guest'}
            disabled={busy !== null}
            leftIcon={<Smartphone className="w-4 h-4" />}
          >
            Continue as Guest
          </Button>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
            Data hanya tersimpan di HP ini. Bisa login kapan saja untuk backup.
          </p>
        </div>

        {!googleReady && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400 text-center leading-relaxed">
            Login Google belum diaktifkan pada build ini. Mode Tamu tetap bisa dipakai penuh.
          </p>
        )}

        <div className="flex items-start gap-2 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
          <span>
            Datamu milikmu. Catatan dan foto struk disimpan di perangkat atau Google Drive pribadi,
            bukan di server KasKilat.
          </span>
        </div>
      </div>
    </div>
  );
};
