/**
 * @file constants.ts
 * @description Konstanta aplikasi, teks UI bahasa Indonesia, warna kategori, dan pola regex OCR.
 */

import { Category } from '../features/categories/types/category.type';

export const APP_CONFIG = {
  NAME: 'KasKilat UMKM',
  TAGLINE: 'Foto Struk, Kas Tercatat Otomatis',
  VERSION: '1.0.0',
  MIN_OCR_CONFIDENCE_THRESHOLD: 70, // Persen ambang batas akurasi OCR
  STORAGE_KEYS: {
    TRANSACTIONS: 'kaskilat_transactions',
    CATEGORIES: 'kaskilat_categories',
    USER_SETTINGS: 'kaskilat_settings',
    ACTIVE_USER: 'kaskilat_active_user',
  },
} as const;

export const PAYMENT_METHODS = [
  'Tunai',
  'QRIS',
  'Transfer BCA',
  'Transfer Mandiri',
  'Transfer BRI',
  'GoPay / OVO / ShopeePay',
  'Kartu Debit / Kredit',
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const DEFAULT_CATEGORIES: Omit<Category, 'user_id'>[] = [
  {
    id: 'cat-in-1',
    name: 'Penjualan Produk',
    type: 'in',
    color: '#10b981', // emerald
    icon: 'ShoppingBag',
  },
  {
    id: 'cat-in-2',
    name: 'Jasa & Layanan',
    type: 'in',
    color: '#06b6d4', // cyan
    icon: 'Wrench',
  },
  {
    id: 'cat-in-3',
    name: 'Penerimaan Piutang',
    type: 'in',
    color: '#3b82f6', // blue
    icon: 'ArrowDownLeft',
  },
  {
    id: 'cat-in-4',
    name: 'Pendapatan Lain',
    type: 'in',
    color: '#8b5cf6', // purple
    icon: 'Coins',
  },
  {
    id: 'cat-out-1',
    name: 'Beli Stok & Bahan',
    type: 'out',
    color: '#ef4444', // red
    icon: 'Package',
  },
  {
    id: 'cat-out-2',
    name: 'Operasional & Listrik',
    type: 'out',
    color: '#f97316', // orange
    icon: 'Zap',
  },
  {
    id: 'cat-out-3',
    name: 'Gaji & Upah',
    type: 'out',
    color: '#ec4899', // pink
    icon: 'Users',
  },
  {
    id: 'cat-out-4',
    name: 'Sewa Tempat & Toko',
    type: 'out',
    color: '#6366f1', // indigo
    icon: 'Home',
  },
  {
    id: 'cat-out-5',
    name: 'Biaya Kirim & Bensin',
    type: 'out',
    color: '#14b8a6', // teal
    icon: 'Truck',
  },
  {
    id: 'cat-out-6',
    name: 'Makan & Konsumsi Usaha',
    type: 'out',
    color: '#eab308', // amber
    icon: 'Utensils',
  },
];

/**
 * Daftar pola regex OCR untuk ekstraksi otomatis dari struk belanja / nota / transfer
 */
export const OCR_REGEX = {
  // Kata kunci total nominal
  TOTAL_KEYWORDS: [
    /(?:grand\s*total|total\s*tagihan|total\s*belanja|total\s*bayar|total\s*akhir|total\s*harga|jumlah\s*rp|total\s*rp|total\s*transfer|nominal\s*transfer|jumlah\s*transfer|rp\.?|idr)\s*[:=.]?\s*(?:rp\.?)?\s*([\d.,\s]+)/i,
    /(?:subtotal|sub\s*total|tunai|cash|debit|qris|dibayar)\s*[:=.]?\s*(?:rp\.?)?\s*([\d.,\s]+)/i,
  ],
  // Pola tanggal umum di Indonesia: DD/MM/YYYY, DD-MM-YYYY, DD MMM YYYY
  DATE_PATTERNS: [
    /(\d{1,2})[\/\-. ](0[1-9]|1[0-2]|\d{1,2})[\/\-. ](20\d{2}|\d{2})/,
    /(\d{1,2})\s+(Jan(?:uari)?|Feb(?:ruari)?|Mar(?:et)?|Apr(?:il)?|Mei|Jun(?:i)?|Jul(?:i)?|Agu(?:stus)?|Sep(?:tember)?|Okt(?:ober)?|Nov(?:ember)?|Des(?:ember)?)\s+(20\d{2})/i,
  ],
  // Kata kunci penentu jenis kas keluar (struk belanja / transfer keluar)
  OUTCOME_KEYWORDS: [
    'struk', 'kasir', 'minimarket', 'indomaret', 'alfamart', 'supermarket',
    'pembelian', 'total belanja', 'kembalian', 'ppn', 'diskon', 'subtotal',
    'harga satuan', 'pembayaran ke', 'tujuan transfer', 'debet', 'debit'
  ],
  // Kata kunci penentu jenis kas masuk (bukti terima transfer / pembayaran customer)
  INCOME_KEYWORDS: [
    'terima dari', 'pengirim', 'dana masuk', 'kredit', 'pembayaran berhasil dari',
    'penjualan', 'invoice dibayar', 'qris berhasil', 'kas masuk'
  ],
  // Pola merchant terkenal atau baris paling atas
  MERCHANT_BLACKLIST_WORDS: [
    'selamat datang', 'terima kasih', 'thank you', 'struk', 'pembayaran',
    'nota kontan', 'kwitansi', 'receipt', 'tanggal', 'cashier', 'kasir',
    'bukti transfer', 'transaksi berhasil', 'm-banking', 'layanan pelanggan'
  ]
} as const;
