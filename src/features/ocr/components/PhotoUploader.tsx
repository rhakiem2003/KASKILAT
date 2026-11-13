/**
 * @file PhotoUploader.tsx
 * @description Komponen pemilih foto struk melalui kamera hp, upload file, atau preset nota contoh.
 */

import React, { useRef } from 'react';
import { Camera, Upload, Sparkles, Image as ImageIcon } from 'lucide-react';
import { SAMPLE_RECEIPTS, SampleReceipt } from '../utils/sampleReceipts';

interface PhotoUploaderProps {
  onImageSelected: (imageSource: string | File, previewUrl: string) => void;
  isLoading?: boolean;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  onImageSelected,
  isLoading = false,
}) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    onImageSelected(file, previewUrl);
  };

  const handleSelectSample = (sample: SampleReceipt) => {
    const dataUrl = sample.generateImage();
    onImageSelected(dataUrl, dataUrl);
  };

  return (
    <div className="w-full space-y-4">
      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Action buttons: Kamera & Galeri */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={isLoading}
          onClick={() => cameraInputRef.current?.click()}
          className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 hover:border-emerald-500 hover:bg-emerald-100/50 transition-all active:scale-[0.98] min-h-[92px]"
        >
          <Camera className="w-6 h-6 mb-1.5 shrink-0" />
          <span className="text-xs font-semibold">Foto Kamera</span>
          <span className="text-[11px] text-emerald-600/70 dark:text-emerald-400/70">
            Jepret struk langsung
          </span>
        </button>

        <button
          type="button"
          disabled={isLoading}
          onClick={() => galleryInputRef.current?.click()}
          className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 transition-all active:scale-[0.98] min-h-[92px]"
        >
          <Upload className="w-6 h-6 mb-1.5 shrink-0 text-slate-500" />
          <span className="text-xs font-semibold">Upload Foto</span>
          <span className="text-[11px] text-slate-400">Dari galeri / file</span>
        </button>
      </div>

      {/* Preset 3 Struk Riil UMKM untuk testing instan */}
      <div className="pt-2">
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
