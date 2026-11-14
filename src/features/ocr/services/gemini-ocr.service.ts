/**
 * @file gemini-ocr.service.ts
 * @description OCR + ekstraksi data struk memakai Gemini Vision (REST API, free tier).
 * Model diminta mengembalikan JSON terstruktur sehingga tidak perlu parsing regex manual.
 */

import { getGeminiApiKey, getGeminiModel } from '../../../lib/gemini-settings';
import { PAYMENT_METHODS, PaymentMethod } from '../../../lib/constants';
import { OCRProgressState, OCRRecognitionResult, ParsedOCRData } from '../types/ocr.type';
import {
  detectPaymentMethod,
  detectTransactionType,
  extractDate,
  formatReceiptItemsDescription,
  ExtractedReceiptItem,
} from '../utils/ocr-parser';
import { parseRupiah } from '../../transactions/utils/formatRupiah';
import { TransactionType } from '../../transactions/types/transaction.type';

const DEFAULT_MODEL = 'gemini-3-flash-preview';
// Model 2.5 sudah deprecated; dicoba terakhir agar API key lama tetap berfungsi.
const FALLBACK_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-2.5-flash'];
const REQUEST_TIMEOUT_MS = 45000;

const PROMPT = `Anda adalah asisten pembukuan UMKM Indonesia. Baca gambar bukti transaksi (struk belanja, nota warung, atau bukti transfer bank/e-wallet) ini.

Kembalikan JSON dengan ketentuan:
- merchant: nama toko / pengirim / penerima yang paling relevan (tanpa alamat).
- date: tanggal transaksi dalam format YYYY-MM-DD. Jika tidak terlihat, isi string kosong.
- amount: angka total akhir yang dibayar atau diterima, satuan rupiah tanpa titik/koma. Jika tidak terbaca, isi 0.
- type: "in" bila uang MASUK ke pemilik usaha (pembayaran pelanggan, transfer masuk, penjualan), "out" bila uang KELUAR (belanja stok, bayar supplier, operasional).
- payment_method: pilih salah satu dari ${JSON.stringify(PAYMENT_METHODS)}.
- confidence: 0-100, seberapa yakin Anda dengan hasil ekstraksi.
- raw_text: seluruh teks yang terlihat pada gambar, urut dari atas ke bawah.
- items: daftar barang/jasa yang dibeli atau diterima. Isi name (nama barang), quantity (jumlah, mis. "2", "5 kg", "1 sak"), dan price (harga/subtotal baris dalam rupiah tanpa titik/koma). Kosongkan array bila tidak ada rincian barang, misalnya bukti transfer.

Aturan: jangan mengarang angka atau nama. Nominal pada baris TOTAL/GRAND TOTAL lebih diutamakan daripada subtotal.`;

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    merchant: { type: 'STRING' },
    date: { type: 'STRING' },
    amount: { type: 'NUMBER' },
    type: { type: 'STRING', enum: ['in', 'out'] },
    payment_method: { type: 'STRING' },
    confidence: { type: 'NUMBER' },
    raw_text: { type: 'STRING' },
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          quantity: { type: 'STRING' },
          price: { type: 'NUMBER' },
        },
        required: ['name'],
      },
    },
  },
  required: ['amount', 'type', 'confidence', 'raw_text'],
};

interface GeminiPayload {
  merchant?: string;
  date?: string;
  amount?: number | string;
  type?: string;
  payment_method?: string;
  confidence?: number;
  raw_text?: string;
  items?: Array<{ name?: string; quantity?: string; price?: number | string }>;
}

interface GeminiApiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
  error?: { message?: string };
}

function dataUrlToInlineParts(dataUrl: string): { mimeType: string; data: string } {
  const match = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl);
  if (!match) {
    throw new Error('Format gambar tidak valid untuk dikirim ke Gemini.');
  }
  return { mimeType: match[1], data: match[2] };
}

const MODEL_UNAVAILABLE_PATTERN =
  /model[^.]*(not found|not supported|no longer available|is not available|deprecated)/i;

function isModelUnavailable(status: number, detail: string): boolean {
  if (status === 404) return true;
  return MODEL_UNAVAILABLE_PATTERN.test(detail);
}

function apiErrorMessage(status: number, detail: string): string {
  if (status === 429) {
    return 'Kuota gratis Gemini sedang habis. Coba lagi nanti atau gunakan Tesseract.';
  }
  if ((status === 400 || status === 403) && /api key/i.test(detail)) {
    return 'Gemini API key tidak valid. Periksa kembali di Pengaturan.';
  }
  return `Gemini AI gagal memproses gambar: ${detail}`;
}

async function requestModel(
  model: string,
  apiKey: string,
  mimeType: string,
  data: string,
  signal: AbortSignal
): Promise<{ response: Response; body: GeminiApiResponse | null }> {
  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: PROMPT },
                { inline_data: { mime_type: mimeType, data } },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
      }
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Gemini AI tidak merespons (timeout). Coba lagi atau gunakan Tesseract.');
    }
    throw new Error('Tidak dapat menghubungi Gemini AI. Periksa koneksi internet.');
  }

  const body = (await response.json().catch(() => null)) as GeminiApiResponse | null;
  return { response, body };
}

function normalizeDate(value: string | undefined, rawText: string): string | null {
  const candidate = (value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return candidate;

  const parsed = extractDate(candidate) || extractDate(rawText);
  return parsed;
}

function normalizeAmount(value: number | string | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 0 ? Math.round(value) : null;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = parseRupiah(value);
    return parsed > 0 ? parsed : null;
  }
  return null;
}

function normalizePaymentMethod(value: string | undefined, rawText: string): PaymentMethod {
  const candidate = (value || '').trim();
  const matched = PAYMENT_METHODS.find(
    (method) => method.toLowerCase() === candidate.toLowerCase()
  );
  if (matched) return matched;
  if (candidate) {
    const partial = PAYMENT_METHODS.find((method) =>
      candidate.toLowerCase().includes(method.toLowerCase())
    );
    if (partial) return partial;
  }
  return detectPaymentMethod(rawText);
}

function normalizeType(value: string | undefined, rawText: string): TransactionType {
  const candidate = (value || '').trim().toLowerCase();
  if (candidate === 'in' || candidate === 'out') return candidate;
  return detectTransactionType(rawText);
}

function buildParsedData(payload: GeminiPayload): ParsedOCRData {
  const rawText = (payload.raw_text || '').trim();
  const amount = normalizeAmount(payload.amount);
  const date = normalizeDate(payload.date, rawText);
  const merchant = (payload.merchant || '').trim() || null;
  const detectedType = normalizeType(payload.type, rawText);
  const items: ExtractedReceiptItem[] = (payload.items || [])
    .map((item) => ({
      name: (item.name || '').trim(),
      quantity: (item.quantity || '').trim() || null,
      price: normalizeAmount(item.price),
    }))
    .filter((item) => item.name);
  const description = formatReceiptItemsDescription(items);

  let confidence = Number(payload.confidence);
  if (!Number.isFinite(confidence)) confidence = 75;
  confidence = Math.max(0, Math.min(100, Math.round(confidence)));
  if (!amount) confidence = Math.min(confidence, 45);
  if (!merchant && !date) confidence = Math.min(confidence, 60);

  return {
    amount,
    date,
    merchant,
    detectedType,
    paymentMethod: normalizePaymentMethod(payload.payment_method, rawText),
    confidence,
    rawText,
    description,
    engine: 'gemini',
  };
}

export function isGeminiOCRAvailable(): boolean {
  return Boolean(getGeminiApiKey());
}

/**
 * Mengirim foto struk ke Gemini dan mengembalikan data terstruktur.
 */
export async function runGeminiOCR(
  imageDataUrl: string,
  onProgress?: (state: OCRProgressState) => void
): Promise<OCRRecognitionResult> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Gemini API key belum diisi. Buka Pengaturan untuk menambahkannya.');
  }

  const configuredModel = getGeminiModel() || DEFAULT_MODEL;
  const models = [configuredModel, ...FALLBACK_MODELS].filter(
    (model, index, list) => model && list.indexOf(model) === index
  );
  const { mimeType, data } = dataUrlToInlineParts(imageDataUrl);

  onProgress?.({
    status: 'recognizing',
    progress: 45,
    message: 'Mengirim foto ke Gemini AI untuk dibaca...',
  });

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let body: GeminiApiResponse | null = null;
  let lastModelError = '';

  try {
    for (const [index, model] of models.entries()) {
      if (index > 0) {
        onProgress?.({
          status: 'recognizing',
          progress: 45,
          message: `Model ${models[index - 1]} tidak tersedia, mencoba ${model}...`,
        });
      }

      const attempt = await requestModel(model, apiKey, mimeType, data, controller.signal);

      if (attempt.response.ok) {
        body = attempt.body;
        console.info(`[OCR] Gemini memakai model ${model}`);
        break;
      }

      const detail = attempt.body?.error?.message || `HTTP ${attempt.response.status}`;
      if (isModelUnavailable(attempt.response.status, detail)) {
        lastModelError = detail;
        continue;
      }

      throw new Error(apiErrorMessage(attempt.response.status, detail));
    }

    if (!body) {
      throw new Error(
        `Tidak ada model Gemini yang tersedia untuk API key ini. Set VITE_GEMINI_MODEL ke model terbaru (mis. ${DEFAULT_MODEL}). Detail: ${lastModelError || 'model tidak ditemukan'}`
      );
    }
  } finally {
    window.clearTimeout(timeout);
  }

  if (body?.promptFeedback?.blockReason) {
    throw new Error('Gambar ditolak oleh Gemini. Coba foto ulang dengan pencahayaan lebih baik.');
  }

  const text = (body?.candidates?.[0]?.content?.parts || [])
    .map((part) => part.text || '')
    .join('')
    .trim();

  if (!text) {
    throw new Error('Gemini AI tidak mengembalikan hasil bacaan untuk gambar ini.');
  }

  let payload: GeminiPayload;
  try {
    payload = JSON.parse(text) as GeminiPayload;
  } catch {
    throw new Error('Hasil Gemini AI tidak dapat dibaca sebagai JSON.');
  }

  const parsed = buildParsedData(payload);
  const wordsCount = parsed.rawText.split(/\s+/).filter(Boolean).length;

  onProgress?.({
    status: 'done',
    progress: 100,
    message: 'Selesai membaca bukti transaksi dengan Gemini AI!',
  });

  return {
    rawText: parsed.rawText,
    confidence: parsed.confidence,
    wordsCount,
    engine: 'gemini',
    kind: 'photo',
    parsed,
  };
}
