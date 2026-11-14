/**
 * @file ocr.service.ts
 * @description Orkestrasi OCR: screenshot/digital capture diproses Tesseract.js (offline, gratis),
 * foto kamera diproses Gemini AI Vision. Jika Gemini tidak tersedia/gagal, otomatis fallback ke Tesseract.
 */

import { createWorker, Worker } from 'tesseract.js';
import {
  OCRProgressState,
  OCRRecognitionResult,
  OCRResult,
  ParsedOCRData,
} from '../types/ocr.type';
import { parseReceiptText } from '../utils/ocr-parser';
import { getGeminiApiKey } from '../../../lib/gemini-settings';
import { prepareImage } from '../../../lib/image-source';
import type { ImageKind } from '../../../lib/image-source';
import { runGeminiOCR } from './gemini-ocr.service';

/**
 * Meningkatkan kontras dan mengonversi gambar ke grayscale untuk akurasi OCR maksimal pada struk termal
 */
export async function preprocessImage(imageSource: string | File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(typeof imageSource === 'string' ? imageSource : URL.createObjectURL(imageSource));
          return;
        }

        // Batasi resolusi maksimal 1600px agar Tesseract cepat dan hemat memori
        const maxDim = 1600;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Gambar ke kanvas
        ctx.drawImage(img, 0, 0, width, height);

        // Filter Grayscale & Kontras adaptif
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          // Luminance formula
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          // Simple contrast stretch: thresholding soft
          const enhanced = gray > 140 ? Math.min(255, gray * 1.1) : gray * 0.85;
          data[i] = enhanced;
          data[i + 1] = enhanced;
          data[i + 2] = enhanced;
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.88));
      } catch (err) {
        // Fallback ke gambar asli jika canvas error
        resolve(typeof imageSource === 'string' ? imageSource : URL.createObjectURL(imageSource));
      }
    };

    img.onerror = () => {
      reject(new Error('Gagal memuat gambar struk untuk diproses.'));
    };

    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      img.src = URL.createObjectURL(imageSource);
    }
  });
}

/**
 * Menjalankan OCR Tesseract.js secara client-side di background WebWorker
 */
export async function runTesseractOCR(
  imageSource: string | File,
  onProgress?: (state: OCRProgressState) => void
): Promise<OCRResult> {
  let worker: Worker | null = null;

  try {
    onProgress?.({
      status: 'preprocessing',
      progress: 15,
      message: 'Mengoptimalkan kontras foto struk...',
    });

    const preprocessedDataUrl = await preprocessImage(imageSource);

    onProgress?.({
      status: 'loading_engine',
      progress: 30,
      message: 'Menyiapkan mesin pengenal teks (Tesseract.js)...',
    });

    // Inisialisasi worker bahasa Inggris & Indonesia (angka & teks nota)
    worker = await createWorker('eng+ind', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          const progressPercent = 30 + Math.round((m.progress || 0) * 60);
          onProgress?.({
            status: 'recognizing',
            progress: Math.min(92, progressPercent),
            message: `Membaca huruf & angka nota (${Math.round((m.progress || 0) * 100)}%)...`,
          });
        }
      },
    });

    onProgress?.({
      status: 'recognizing',
      progress: 50,
      message: 'Membaca huruf, tanggal, dan nominal...',
    });

    const recognitionResult = await worker.recognize(preprocessedDataUrl);
    const { data } = recognitionResult;

    onProgress?.({
      status: 'done',
      progress: 100,
      message: 'Selesai membaca bukti transaksi!',
    });

    await worker.terminate();
    worker = null;

    const words = (data.text || '').trim().split(/\s+/).filter(Boolean);

    return {
      rawText: data.text || '',
      confidence: Math.round(data.confidence || 75),
      wordsCount: words.length,
    };
  } catch (error) {
    if (worker) {
      try {
        await (worker as Worker).terminate();
      } catch {
        // Abaikan pembersihan worker
      }
    }

    const errorMessage = error instanceof Error ? error.message : 'Gagal memproses gambar struk.';
    onProgress?.({
      status: 'error',
      progress: 0,
      message: errorMessage,
      error: errorMessage,
    });

    throw new Error(errorMessage);
  }
}

/**
 * Entry point OCR aplikasi: memilih mesin berdasarkan jenis gambar lalu mem-parse hasilnya.
 * Screenshot → Tesseract; foto kamera → Gemini (jika API key tersedia) → fallback Tesseract.
 */
export async function recognizeReceipt(
  imageSource: string | File,
  onProgress?: (state: OCRProgressState) => void,
  options?: { kind?: ImageKind }
): Promise<OCRRecognitionResult> {
  onProgress?.({
    status: 'preprocessing',
    progress: 10,
    message: 'Menyiapkan foto struk...',
  });

  const prepared = await prepareImage(imageSource);
  const kind = options?.kind ?? prepared.kind;
  const geminiAvailable = Boolean(getGeminiApiKey());
  let fallbackReason: string | null = null;

  if (kind === 'photo' && geminiAvailable) {
    try {
      const result = await runGeminiOCR(prepared.dataUrl, onProgress);
      return { ...result, kind };
    } catch (error) {
      fallbackReason = error instanceof Error ? error.message : 'Gemini tidak dapat dipanggil.';
      console.warn('[OCR] Gemini gagal, beralih ke Tesseract:', error);
      onProgress?.({
        status: 'loading_engine',
        progress: 25,
        message: `Gemini tidak dipakai (${fallbackReason}). Beralih ke Tesseract (offline)...`,
      });
    }
  }

  onProgress?.({
    status: 'loading_engine',
    progress: 25,
    message:
      kind === 'screenshot'
        ? 'Screenshot terdeteksi — memakai Tesseract.js (offline)...'
        : 'Menyiapkan Tesseract.js (offline)...',
  });

  const tesseractResult = await runTesseractOCR(prepared.dataUrl, onProgress);
  const parsed: ParsedOCRData = {
    ...parseReceiptText(tesseractResult.rawText, tesseractResult.confidence),
    engine: 'tesseract',
    fallbackReason,
  };

  // Screenshot biasanya bersih, tapi jika nominal gagal terbaca dan Gemini tersedia, coba eskalasi
  const needsEscalation =
    kind === 'screenshot' && geminiAvailable && (!parsed.amount || parsed.confidence < 65);
  if (needsEscalation) {
    try {
      onProgress?.({
        status: 'recognizing',
        progress: 88,
        message: 'Hasil Tesseract kurang akurat, mencoba Gemini AI...',
      });
      const result = await runGeminiOCR(prepared.dataUrl, onProgress);
      return { ...result, kind };
    } catch (error) {
      parsed.fallbackReason =
        error instanceof Error ? error.message : 'Gemini tidak dapat dipanggil.';
      console.warn('[OCR] Eskalasi ke Gemini gagal, memakai hasil Tesseract:', error);
    }
  }

  return {
    ...tesseractResult,
    engine: 'tesseract',
    kind,
    parsed,
  };
}
