/**
 * @file ocr-parser.ts
 * @description Parser teks murni hasil OCR untuk mendeteksi nominal total, tanggal, nama merchant, dan jenis transaksi.
 */

import { OCR_REGEX, PAYMENT_METHODS, PaymentMethod } from '../../../lib/constants';
import { TransactionType } from '../../transactions/types/transaction.type';
import { ParsedOCRData } from '../types/ocr.type';
import { formatRupiah, parseRupiah } from '../../transactions/utils/formatRupiah';

export interface ExtractedReceiptItem {
  name: string;
  quantity?: string | null;
  price?: number | null;
}

const QUANTITY_UNITS =
  'x|pcs|pc|buah|biji|unit|pack|dus|box|sak|btl|botol|ikat|bungkus|porsi|set|lembar|roll';
const QUANTITY_UNITS_WITH_WEIGHT = `${QUANTITY_UNITS}|kg|g|gram|liter|l|ml`;

const INLINE_QUANTITY_PATTERN = new RegExp(
  `(?:^|\\s)(\\d+(?:[.,]\\d+)?)\\s*(${QUANTITY_UNITS})\\b`,
  'i'
);
const PAREN_QUANTITY_PATTERN = new RegExp(
  `\\(\\s*(\\d+(?:[.,]\\d+)?)\\s*(${QUANTITY_UNITS_WITH_WEIGHT})?\\s*\\)`,
  'i'
);
const QUANTITY_ONLY_PATTERN = new RegExp(
  `^(\\d+(?:[.,]\\d+)?)\\s*(${QUANTITY_UNITS_WITH_WEIGHT})$`,
  'i'
);
const DETAIL_LINE_PATTERN = new RegExp(
  `^(\\d+(?:[.,]\\d+)?)\\s*(${QUANTITY_UNITS_WITH_WEIGHT})\\s+(?:rp\\.?\\s*)?(\\d[\\d.,]*)$`,
  'i'
);
const DETAIL_LINE_PRICE_FIRST_PATTERN = new RegExp(
  `^(?:rp\\.?\\s*)?(\\d[\\d.,]*)\\s+(\\d+(?:[.,]\\d+)?)\\s*(${QUANTITY_UNITS_WITH_WEIGHT})$`,
  'i'
);
const PRICE_ONLY_PATTERN = /^(?:rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})+|\d{4,})(?:[.,]\d{2})?$/i;
const TRAILING_PRICE_PATTERN =
  /(?:^|\s)(?:rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})+|\d{4,})(?:[.,]\d{2})?\s*$/i;

const ITEM_STOP_PATTERN =
  /^(total|grand\s+total|sub\s*total|subtotal|tunai|cash|kembali|kembalian|bayar|pembayaran|debit|kredit|qris|ppn|pajak|diskon)\b/i;

const ITEM_LINE_BLACKLIST = [
  ...OCR_REGEX.MERCHANT_BLACKLIST_WORDS,
  'total',
  'subtotal',
  'sub total',
  'tunai',
  'cash',
  'kembali',
  'kembalian',
  'bayar',
  'pembayaran',
  'ppn',
  'pajak',
  'diskon',
  'potongan',
  'saldo',
  'jumlah',
  'harga',
  'alamat',
  'telp',
  'telpon',
  'phone',
  'npwp',
  'qris',
  'debit',
  'kredit',
  'admin',
  'nota',
  'invoice',
  'faktur',
  'pelanggan',
  'customer',
  'transfer',
  'nominal',
  'berita',
  'pengirim',
  'penerima',
  'rekening',
  'tujuan',
  'dana masuk',
  'm-bca',
  'bca',
  'mandiri',
  'bri',
  'barang yang dibeli',
  'tanda terima',
  'cap toko',
  'lunas',
  'status',
  'kepada',
  'keterangan',
];

function cleanLine(line: string): string {
  return line
    .replace(/^[\s*#=_\-•.]+/, '')
    .replace(/[\s*#=_]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeQuantity(value: string, unit?: string): string {
  const amount = value.replace(',', '.');
  if (!unit) return `${amount}x`;
  const normalizedUnit = unit.toLowerCase();
  if (normalizedUnit === 'x') return `${amount}x`;
  return `${amount} ${normalizedUnit}`;
}

function isItemNameLine(line: string): boolean {
  const lower = line.toLowerCase();
  if (line.length < 3 || line.length > 70) return false;
  if (!/[a-z]{3,}/i.test(line)) return false;
  if (ITEM_STOP_PATTERN.test(lower)) return false;
  if (ITEM_LINE_BLACKLIST.some((word) => lower.includes(word))) return false;
  if (OCR_REGEX.DATE_PATTERNS.some((pattern) => pattern.test(line))) return false;
  if (/^[\d.,\s:/\-]+$/.test(line)) return false;
  return true;
}

function parseDetailLine(line: string): { quantity: string; price: number } | null {
  const quantityFirst = DETAIL_LINE_PATTERN.exec(line);
  if (quantityFirst) {
    const price = parseRupiah(quantityFirst[3]);
    if (price > 0) {
      return {
        quantity: normalizeQuantity(quantityFirst[1], quantityFirst[2]),
        price,
      };
    }
  }

  const priceFirst = DETAIL_LINE_PRICE_FIRST_PATTERN.exec(line);
  if (priceFirst) {
    const price = parseRupiah(priceFirst[1]);
    if (price > 0) {
      return {
        quantity: normalizeQuantity(priceFirst[2], priceFirst[3]),
        price,
      };
    }
  }

  return null;
}

function parseItemLine(line: string): ExtractedReceiptItem | null {
  let working = line;
  let quantity: string | null = null;

  const paren = PAREN_QUANTITY_PATTERN.exec(working);
  if (paren) {
    quantity = normalizeQuantity(paren[1], paren[2]);
    working = working.replace(paren[0], ' ');
  }

  let price: number | null = null;
  const trailingPrice = TRAILING_PRICE_PATTERN.exec(working);
  if (trailingPrice) {
    const value = parseRupiah(trailingPrice[1]);
    if (value > 0) {
      price = value;
      working = working.slice(0, trailingPrice.index);
    }
  }

  if (!quantity) {
    const inline = INLINE_QUANTITY_PATTERN.exec(working);
    if (inline) {
      quantity = normalizeQuantity(inline[1], inline[2]);
      working = working.replace(inline[0], ' ');
    }
  }

  const name = cleanLine(working);
  if (!name || !/[a-z]{2,}/i.test(name)) return null;
  return { name, quantity, price };
}

/**
 * Mengambil rincian barang (nama, jumlah, harga) dari teks struk/nota.
 * Baris header, total, dan pembayaran diabaikan agar catatan tetap bersih.
 */
export function extractReceiptItems(rawText: string): ExtractedReceiptItem[] {
  if (!rawText) return [];

  const lines = rawText.split('\n').map(cleanLine).filter(Boolean);
  const items: ExtractedReceiptItem[] = [];
  let current: ExtractedReceiptItem | null = null;

  const pushCurrent = () => {
    if (current && (current.quantity || current.price)) {
      items.push(current);
    }
    current = null;
  };

  for (const line of lines) {
    if (ITEM_STOP_PATTERN.test(line)) {
      pushCurrent();
      break;
    }

    const detail = parseDetailLine(line);
    if (detail && current) {
      current.quantity = detail.quantity;
      current.price = detail.price;
      continue;
    }

    const quantityOnly = QUANTITY_ONLY_PATTERN.exec(line);
    if (quantityOnly && current) {
      current.quantity = normalizeQuantity(quantityOnly[1], quantityOnly[2]);
      continue;
    }

    if (PRICE_ONLY_PATTERN.test(line) && current) {
      const price = parseRupiah(line);
      if (price > 0) {
        current.price = price;
        continue;
      }
    }

    if (isItemNameLine(line)) {
      pushCurrent();
      current = parseItemLine(line);
    }
  }

  pushCurrent();
  return items.slice(0, 8);
}

/**
 * Mengubah daftar barang menjadi satu baris catatan, mis.
 * "Minyak Goreng (2x) = Rp 68.000; Gula Pasir (3x) = Rp 49.500".
 */
export function formatReceiptItemsDescription(
  items: ExtractedReceiptItem[]
): string | null {
  const parts = items
    .map((item) => {
      const name = item.name.trim();
      if (!name) return null;
      const rawQuantity = item.quantity?.trim();
      const normalizedQuantity =
        rawQuantity && /^\d+(?:[.,]\d+)?$/.test(rawQuantity)
          ? `${rawQuantity}x`
          : rawQuantity;
      const quantity = normalizedQuantity ? ` (${normalizedQuantity})` : '';
      const price = item.price && item.price > 0 ? ` = ${formatRupiah(item.price)}` : '';
      return `${name}${quantity}${price}`;
    })
    .filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join('; ') : null;
}

/**
 * Mengambil angka TOTAL / GRAND TOTAL dari teks OCR
 * Mencari baris dengan kata kunci 'total', 'grand total', 'subtotal', atau nominal terbesar
 */
export function extractAmount(rawText: string): number | null {
  if (!rawText) return null;
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);

  // 1. Coba cari baris yang mencocokkan kata kunci TOTAL_KEYWORDS
  for (const regex of OCR_REGEX.TOTAL_KEYWORDS) {
    for (const line of lines) {
      const match = line.match(regex);
      if (match && match[1]) {
        const val = parseRupiah(match[1]);
        if (val > 0) return val;
      }
    }
  }

  // 2. Fallback: Cari semua angka nominal 4 digit atau lebih (misal 15000, 25.000) dan ambil angka terbesar
  const numbersFound: number[] = [];
  for (const line of lines) {
    const rawNumbers = line.match(/(?:rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?|\d{4,})/gi);
    if (rawNumbers) {
      for (const numStr of rawNumbers) {
        const val = parseRupiah(numStr);
        if (val >= 1000 && val < 1000000000) {
          numbersFound.push(val);
        }
      }
    }
  }

  if (numbersFound.length > 0) {
    // Ambil angka paling masuk akal (biasanya angka terbesar di struk adalah Total)
    return Math.max(...numbersFound);
  }

  return null;
}

/**
 * Mengekstrak tanggal transaksi dari teks OCR ke format YYYY-MM-DD
 */
export function extractDate(rawText: string): string | null {
  if (!rawText) return null;

  // Coba pola numerik (DD/MM/YYYY atau DD-MM-YYYY)
  for (const regex of OCR_REGEX.DATE_PATTERNS) {
    const match = rawText.match(regex);
    if (match) {
      if (match.length >= 4 && isNaN(Number(match[2]))) {
        // Format dengan nama bulan (DD Bulan YYYY)
        return parseDateWithMonthName(match[1], match[2], match[3]);
      } else if (match.length >= 4) {
        return normalizeNumericDate(match[1], match[2], match[3]);
      }
    }
  }

  return null;
}

/**
 * Helper mengonversi tanggal dengan nama bulan Indonesia ke ISO string
 */
function parseDateWithMonthName(dayStr: string, monthStr: string, yearStr: string): string {
  const months: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', mei: '05', jun: '06',
    jul: '07', agu: '08', sep: '09', okt: '10', nov: '11', des: '12',
  };
  const prefix = monthStr.substring(0, 3).toLowerCase();
  const m = months[prefix] || '01';
  const d = dayStr.padStart(2, '0');
  const y = yearStr.length === 2 ? `20${yearStr}` : yearStr;
  return `${y}-${m}-${d}`;
}

/**
 * Helper menormalkan format tanggal numerik
 */
function normalizeNumericDate(dayStr: string, monthStr: string, yearStr: string): string {
  const d = dayStr.padStart(2, '0');
  const m = monthStr.padStart(2, '0');
  const y = yearStr.length === 2 ? `20${yearStr}` : yearStr;
  return `${y}-${m}-${d}`;
}

/**
 * Mengekstrak nama merchant / toko / nama pengirim dari 4 baris pertama
 */
export function extractMerchant(rawText: string): string | null {
  if (!rawText) return null;
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length >= 3 && l.length <= 40);

  for (const line of lines.slice(0, 5)) {
    const lower = line.toLowerCase();
    const isBlacklisted = OCR_REGEX.MERCHANT_BLACKLIST_WORDS.some((word) =>
      lower.includes(word)
    );
    // Hindari baris yang murni angka atau nomor struk
    const isPureDigits = /^\d+$/.test(line.replace(/[\s\-_:]/g, ''));

    if (!isBlacklisted && !isPureDigits) {
      return line.replace(/[*#=_\-]/g, '').trim();
    }
  }

  return null;
}

/**
 * Menentukan tipe transaksi (kas masuk vs kas keluar) berdasarkan kata kunci struk/transfer
 */
export function detectTransactionType(rawText: string): TransactionType {
  const lower = rawText.toLowerCase();

  const incomeScore = OCR_REGEX.INCOME_KEYWORDS.reduce(
    (acc, kw) => (lower.includes(kw) ? acc + 1 : acc),
    0
  );
  const outcomeScore = OCR_REGEX.OUTCOME_KEYWORDS.reduce(
    (acc, kw) => (lower.includes(kw) ? acc + 1 : acc),
    0
  );

  // Jika struk belanja minimarket / kasir, hampir pasti adalah kas pengeluaran
  if (outcomeScore >= incomeScore) {
    return 'out';
  }
  return 'in';
}

/**
 * Mendeteksi metode pembayaran yang tertera pada bukti transaksi
 */
export function detectPaymentMethod(rawText: string): PaymentMethod {
  const lower = rawText.toLowerCase();

  if (lower.includes('qris') || lower.includes('gopay') || lower.includes('ovo') || lower.includes('shopeepay')) {
    return lower.includes('qris') ? 'QRIS' : 'GoPay / OVO / ShopeePay';
  }
  if (lower.includes('bca')) return 'Transfer BCA';
  if (lower.includes('mandiri')) return 'Transfer Mandiri';
  if (lower.includes('bri')) return 'Transfer BRI';
  if (lower.includes('debit') || lower.includes('kredit') || lower.includes('edc')) {
    return 'Kartu Debit / Kredit';
  }
  return 'Tunai';
}

/**
 * Fungsi orkestrasi lengkap: parsing hasil mentah OCR menjadi ParsedOCRData terstruktur
 */
export function parseReceiptText(rawText: string, ocrConfidence: number): ParsedOCRData {
  const amount = extractAmount(rawText);
  const date = extractDate(rawText);
  const merchant = extractMerchant(rawText);
  const detectedType = detectTransactionType(rawText);
  const paymentMethod = detectPaymentMethod(rawText);
  const description = formatReceiptItemsDescription(extractReceiptItems(rawText));

  // Hitung confidence komposit berdasarkan kelengkapan data yang berhasil diurai
  let compositeConfidence = ocrConfidence;
  if (!amount) compositeConfidence = Math.min(compositeConfidence, 50);
  if (!merchant && !date) compositeConfidence = Math.min(compositeConfidence, 60);

  return {
    amount,
    date,
    merchant,
    detectedType,
    paymentMethod,
    confidence: Math.round(compositeConfidence),
    rawText,
    description,
  };
}
