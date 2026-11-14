/**
 * @file constants.ts
 * @description Konstanta aplikasi, teks UI bahasa Indonesia, warna kategori, dan pola regex OCR.
 */

export const APP_CONFIG = {
  NAME: 'KasKilat',
  TAGLINE: 'Cashflow Tracker UMKM + Personal',
  VERSION: '1.0.0',
  MIN_OCR_CONFIDENCE_THRESHOLD: 70,
  STORAGE_KEYS: {
    GEMINI_API_KEY: 'kaskilat_gemini_api_key',
    GOOGLE_SESSION: 'kaskilat_google_session',
    GUEST_WARNING_SHOWN: 'kaskilat_guest_warning_shown',
    TEMPLATE_CHOICE: 'kaskilat_template_choice',
    DRIVE_FOLDER_PREFIX: 'kaskilat_gdrive_folder_',
    LEGACY_TRANSACTIONS: 'kaskilat_transactions',
    LEGACY_CATEGORIES: 'kaskilat_categories',
  },
} as const;

/**
 * Client ID OAuth publik (Web application). Aman ditanam di bundle: keamanan
 * flow token bergantung pada Authorized JavaScript origins, bukan kerahasiaan ID.
 * Env VITE_GOOGLE_CLIENT_ID tetap bisa menimpa nilai ini.
 */
export const DEFAULT_GOOGLE_CLIENT_ID =
  '85880586033-5ea9ilsrbvc9mcsmvjr1prbi3ttvnus4.apps.googleusercontent.com';

/**
 * Login panjang: saat token Google kedaluwarsa, aplikasi memperbaruinya diam-diam
 * lewat pengalihan halaman ke Google (bukan jendela popup), sehingga pengguna tidak
 * perlu menekan "Sambung" tiap membuka aplikasi.
 *
 * Hanya berjalan pada origin yang alamat kembalinya (Authorized redirect URI)
 * sudah terdaftar di Google Cloud Console. Origin lain tetap memakai popup biasa.
 */
export const GOOGLE_SILENT_RESTORE_ENABLED = true;

export const GOOGLE_SILENT_RESTORE_ORIGINS = ['https://kaskilat.vercel.app'];

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

/**
 * Pola regex OCR untuk ekstraksi otomatis dari struk belanja / nota / transfer.
 */
export const OCR_REGEX = {
  TOTAL_KEYWORDS: [
    /(?:grand\s*total|total\s*tagihan|total\s*belanja|total\s*bayar|total\s*akhir|total\s*harga|jumlah\s*rp|total\s*rp|total\s*transfer|nominal\s*transfer|jumlah\s*transfer|rp\.?|idr)\s*[:=.]?\s*(?:rp\.?)?\s*([\d.,\s]+)/i,
    /(?:subtotal|sub\s*total|tunai|cash|debit|qris|dibayar)\s*[:=.]?\s*(?:rp\.?)?\s*([\d.,\s]+)/i,
  ],
  DATE_PATTERNS: [
    /(\d{1,2})[/\-. ](0[1-9]|1[0-2]|\d{1,2})[/\-. ](20\d{2}|\d{2})/,
    /(\d{1,2})\s+(Jan(?:uari)?|Feb(?:ruari)?|Mar(?:et)?|Apr(?:il)?|Mei|Jun(?:i)?|Jul(?:i)?|Agu(?:stus)?|Sep(?:tember)?|Okt(?:ober)?|Nov(?:ember)?|Des(?:ember)?)\s+(20\d{2})/i,
  ],
  OUTCOME_KEYWORDS: [
    'struk', 'kasir', 'minimarket', 'indomaret', 'alfamart', 'supermarket',
    'pembelian', 'total belanja', 'kembalian', 'ppn', 'diskon', 'subtotal',
    'harga satuan', 'pembayaran ke', 'tujuan transfer', 'debet', 'debit',
  ],
  INCOME_KEYWORDS: [
    'terima dari', 'pengirim', 'dana masuk', 'kredit', 'pembayaran berhasil dari',
    'penjualan', 'invoice dibayar', 'qris berhasil', 'kas masuk',
  ],
  MERCHANT_BLACKLIST_WORDS: [
    'selamat datang', 'terima kasih', 'thank you', 'struk', 'pembayaran',
    'nota kontan', 'kwitansi', 'receipt', 'tanggal', 'cashier', 'kasir',
    'bukti transfer', 'transaksi berhasil', 'm-banking', 'layanan pelanggan',
  ],
} as const;
