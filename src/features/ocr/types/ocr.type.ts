/**
 * @file ocr.type.ts
 * @description Tipe data untuk modul OCR dan ekstraksi data struk/nota
 */

import { TransactionType } from '../../transactions/types/transaction.type';
import type { ImageKind } from '../../../lib/image-source';

export type OCREngine = 'gemini' | 'tesseract';

export interface OCRResult {
  rawText: string;
  confidence: number; // 0 - 100
  wordsCount: number;
}

export interface OCRRecognitionResult extends OCRResult {
  engine: OCREngine;
  kind: ImageKind;
  parsed: ParsedOCRData;
}

export interface ParsedOCRData {
  amount: number | null;
  date: string | null; // YYYY-MM-DD
  merchant: string | null;
  detectedType: TransactionType;
  paymentMethod: string | null;
  confidence: number; // 0 - 100
  rawText: string;
  description?: string | null; // rincian barang, jumlah, dan harga
  engine?: OCREngine;
  fallbackReason?: string | null;
}

export type OCRProcessingStatus =
  | 'idle'
  | 'loading_engine'
  | 'preprocessing'
  | 'recognizing'
  | 'parsing'
  | 'done'
  | 'error';

export interface OCRProgressState {
  status: OCRProcessingStatus;
  progress: number; // 0 to 100
  message: string;
  error?: string | null;
}

export type OCRConfidenceLevel = 'high' | 'medium' | 'low';
