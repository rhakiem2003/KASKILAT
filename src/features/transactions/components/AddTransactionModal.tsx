/**
 * @file AddTransactionModal.tsx
 * @description Pilihan jalur pencatatan: kamera struk, screenshot bukti transfer, atau input manual.
 */

import React from 'react';
import { Camera, ImageUp, PencilLine } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCamera: () => void;
  onScreenshot: () => void;
  onManual: () => void;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  onCamera,
  onScreenshot,
  onManual,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Catat Transaksi"
      description="Pilih cara mencatat kas masuk / keluar"
    >
      <div className="space-y-2.5">
        <button
          type="button"
          onClick={onCamera}
          className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/70 dark:bg-emerald-950/20 text-left hover:border-emerald-500 transition-all active:scale-[0.99] min-h-[76px]"
        >
          <span className="text-2xl shrink-0" aria-hidden="true">📷</span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-emerald-900 dark:text-emerald-300">
              Camera - Foto Struk Kertas
            </span>
            <span className="block text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
              Jepret nota belanja, dibaca Gemini / OCR offline
            </span>
          </span>
          <Camera className="w-4 h-4 text-emerald-600 shrink-0" />
        </button>

        <button
          type="button"
          onClick={onScreenshot}
          className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-left hover:border-slate-300 dark:hover:border-slate-700 transition-all active:scale-[0.99] min-h-[76px]"
        >
          <span className="text-2xl shrink-0" aria-hidden="true">🖼️</span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-slate-900 dark:text-slate-100">
              Upload Screenshot - Bukti Transfer / E-Wallet
            </span>
            <span className="block text-[11px] text-slate-500 dark:text-slate-400">
              Dari galeri / file, dibaca Tesseract offline
            </span>
          </span>
          <ImageUp className="w-4 h-4 text-slate-500 shrink-0" />
        </button>

        <button
          type="button"
          onClick={onManual}
          className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-left hover:border-slate-300 dark:hover:border-slate-700 transition-all active:scale-[0.99] min-h-[76px]"
        >
          <span className="text-2xl shrink-0" aria-hidden="true">⌨️</span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-slate-900 dark:text-slate-100">
              Input Manual
            </span>
            <span className="block text-[11px] text-slate-500 dark:text-slate-400">
              Ketik nominal, tanggal, dan catatan sendiri
            </span>
          </span>
          <PencilLine className="w-4 h-4 text-slate-500 shrink-0" />
        </button>
      </div>
    </Modal>
  );
};
