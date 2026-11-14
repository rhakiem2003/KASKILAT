/**
 * @file ToastHost.tsx
 * @description Penampil notifikasi ringan (sync/OCR/simpan) di atas navigasi.
 */

import React, { useSyncExternalStore } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { dismissToast, getToasts, subscribeToasts } from '../../lib/toast';

const TONE_STYLES = {
  info: 'bg-slate-900/95 text-white border-slate-700',
  success: 'bg-emerald-700/95 text-white border-emerald-600',
  error: 'bg-rose-700/95 text-white border-rose-600',
} as const;

const TONE_ICONS = {
  info: Info,
  success: CheckCircle2,
  error: AlertCircle,
} as const;

export const ToastHost: React.FC = () => {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getToasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-20 md:bottom-6 z-[70] flex flex-col items-center gap-2 px-4 pointer-events-none">
      {toasts.map((toast) => {
        const Icon = TONE_ICONS[toast.tone];
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-2.5 w-full max-w-sm px-3.5 py-2.5 rounded-xl border shadow-lg backdrop-blur-sm text-xs leading-relaxed ${TONE_STYLES[toast.tone]}`}
            role="status"
          >
            <Icon className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1">{toast.message}</span>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="shrink-0 opacity-70 hover:opacity-100"
              aria-label="Tutup notifikasi"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
