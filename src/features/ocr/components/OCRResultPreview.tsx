/**
 * @file OCRResultPreview.tsx
 * @description Indikator proses pemindaian OCR dan preview teks mentah hasil pengenalan.
 */

import React, { useState } from 'react';
import { Loader2, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { OCRProgressState, ParsedOCRData } from '../types/ocr.type';
import { APP_CONFIG } from '../../../lib/constants';

interface OCRResultPreviewProps {
  progressState: OCRProgressState;
  parsedData: ParsedOCRData | null;
  previewImageUrl: string | null;
}

export const OCRResultPreview: React.FC<OCRResultPreviewProps> = ({
  progressState,
  parsedData,
  previewImageUrl,
}) => {
  const [showRawText, setShowRawText] = useState(false);
  const isScanning =
    progressState.status !== 'idle' &&
    progressState.status !== 'done' &&
    progressState.status !== 'error';

  const isLowConfidence =
    parsedData && parsedData.confidence < APP_CONFIG.MIN_OCR_CONFIDENCE_THRESHOLD;

  return (
    <div className="w-full space-y-3">
      {/* Gambar Thumbnail & Status Scanning */}
      {previewImageUrl && (
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900/5 max-h-48 flex items-center justify-center">
          <img
            src={previewImageUrl}
            alt="Bukti Struk Transaksi"
            className="w-full h-44 object-contain"
          />

          {isScanning && (
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-white">
              <Loader2 className="w-7 h-7 animate-spin text-emerald-400 mb-2" />
              <p className="text-xs font-semibold">{progressState.message}</p>
              <div className="w-48 bg-white/20 rounded-full h-1.5 mt-2.5 overflow-hidden">
                <div
                  className="bg-emerald-400 h-full transition-all duration-300"
                  style={{ width: `${progressState.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Peringatan Akurasi Rendah jika < 70% */}
      {parsedData && isLowConfidence && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-300 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div className="min-w-0">
            <span className="font-semibold">Akurasi Pembacaan OCR {parsedData.confidence}%: </span>
            <span>
              Foto agak buram atau teks terpotong. Mohon periksa kembali kolom nominal dan tanggal di bawah sebelum menyimpan.
            </span>
          </div>
        </div>
      )}

      {/* Alasan Gemini tidak dipakai */}
      {parsedData?.fallbackReason && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-300 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div className="min-w-0">
            <span className="font-semibold">Gemini tidak dipakai: </span>
            <span>{parsedData.fallbackReason}</span>
          </div>
        </div>
      )}

      {/* Accordion Teks Mentah OCR */}
      {parsedData && parsedData.rawText && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setShowRawText(!showRawText)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-medium transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Lihat Teks Mentah Struk ({parsedData.confidence}% akurat
              {parsedData.engine
                ? ` · ${parsedData.engine === 'gemini' ? 'Gemini AI' : 'Tesseract'}`
                : ''}
              )
            </span>
            {showRawText ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showRawText && (
            <div className="p-3 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-600 dark:text-slate-300 whitespace-pre-wrap max-h-36 overflow-y-auto">
              {parsedData.rawText}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
