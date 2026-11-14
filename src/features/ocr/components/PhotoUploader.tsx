/**
 * @file PhotoUploader.tsx
 * @description Dua jalur unggah: kamera untuk struk kertas, atau screenshot untuk bukti transfer / e-wallet.
 */

import React, { useLayoutEffect, useRef } from 'react';
import { Camera, Upload, Sparkles, Image as ImageIcon, ShieldCheck } from 'lucide-react';
import type { ImageKind } from '../../../lib/image-source';
import { capturePhotoWithCamera, isNativeCameraAvailable } from '../../../lib/camera';
import { SAMPLE_RECEIPTS, SampleReceipt } from '../utils/sampleReceipts';

interface PhotoUploaderProps {
  onImageSelected: (imageSource: string | File, previewUrl: string, kind: ImageKind) => void;
  isLoading?: boolean;
  /** Sumber yang sudah dipilih sebelumnya: langsung buka kamera / file, tanpa pilih dua kali. */
  autoStart?: ImageKind | null;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  onImageSelected,
  isLoading = false,
  autoStart = null,
}) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const autoStartedRef = useRef(false);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    kind: ImageKind
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    onImageSelected(file, previewUrl, kind);
    e.target.value = '';
  };

  const handleSelectSample = (sample: SampleReceipt) => {
    const dataUrl = sample.generateImage();
    onImageSelected(dataUrl, dataUrl, 'screenshot');
  };

  const handleCameraClick = async () => {
    const result = await capturePhotoWithCamera();
    if (result.status === 'captured') {
      onImageSelected(result.dataUrl, result.dataUrl, 'photo');
      return;
    }
    if (result.status === 'unavailable') {
      cameraInputRef.current?.click();
    }
  };

  // Layout effect: klik input file tetap dianggap bagian dari gesture pengguna (aman di iOS).
  useLayoutEffect(() => {
    if (!autoStart || autoStartedRef.current) return;
    autoStartedRef.current = true;

    if (autoStart === 'photo') {
      if (isNativeCameraAvailable()) {
        void handleCameraClick();
      } else {
        cameraInputRef.current?.click();
      }
    } else {
      galleryInputRef.current?.click();
    }
  }, [autoStart]);

  return (
    <div className="w-full space-y-4">
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFileChange(e, 'photo')}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileChange(e, 'screenshot')}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          disabled={isLoading}
          onClick={handleCameraClick}
          className="flex items-center gap-3 p-4 rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/70 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 hover:border-emerald-500 hover:bg-emerald-100/60 transition-all active:scale-[0.98] min-h-[76px] text-left"
        >
          <span className="text-2xl shrink-0" aria-hidden="true">📷</span>
          <span className="min-w-0">
            <span className="block text-sm font-bold">Camera</span>
            <span className="block text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
              Foto Struk Kertas
            </span>
          </span>
        </button>

        <button
          type="button"
          disabled={isLoading}
          onClick={() => galleryInputRef.current?.click()}
          className="flex items-center gap-3 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 transition-all active:scale-[0.98] min-h-[76px] text-left"
        >
          <span className="text-2xl shrink-0" aria-hidden="true">🖼️</span>
          <span className="min-w-0">
            <span className="block text-sm font-bold">Upload Screenshot</span>
            <span className="block text-[11px] text-slate-500 dark:text-slate-400">
              Bukti Transfer / E-Wallet
            </span>
          </span>
        </button>
      </div>

      <div className="flex items-start gap-2 px-1 text-[11px] text-slate-500 dark:text-slate-400">
        <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-600" />
        <span>
          Foto struk tidak memenuhi Galeri HP kamu. Tersimpan rapi di Drive.
        </span>
      </div>

      <div className="pt-1">
        <div className="flex items-center gap-1.5 mb-2.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Atau Coba 1-Klik Contoh Struk Riil:
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {SAMPLE_RECEIPTS.map((sample) => (
            <button
              key={sample.id}
              type="button"
              disabled={isLoading}
              onClick={() => handleSelectSample(sample)}
              className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 text-left transition-colors active:scale-[0.99]"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                <ImageIcon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {sample.title}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {sample.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
