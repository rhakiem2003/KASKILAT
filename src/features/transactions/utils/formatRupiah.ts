/**
 * @file formatRupiah.ts
 * @description Format angka ke mata uang Rupiah Indonesia (Rp) dan parsing input numerik.
 */

/**
 * Memformat angka numerik menjadi format mata uang Rupiah (contoh: Rp 50.000)
 */
export function formatRupiah(amount: number, withPrefix = true): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return withPrefix ? 'Rp 0' : '0';
  }

  const rounded = Math.round(amount);
  const formatted = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0,
  }).format(rounded);

  return withPrefix ? `Rp ${formatted}` : formatted;
}

/**
 * Parsing teks string input atau hasil OCR menjadi angka float murni
 */
export function parseRupiah(raw: string): number {
  if (!raw) return 0;

  // Bersihkan karakter selain angka, titik, dan koma
  let cleaned = raw.replace(/[^\d.,]/g, '').trim();

  // Tangani format ribuan Indonesia dengan titik (cth: 50.000,00 atau 50.000)
  if (cleaned.includes('.') && cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes('.')) {
    // Jika hanya titik dan ada 3 digit setelah titik, biasanya itu pemisah ribuan
    const parts = cleaned.split('.');
    if (parts.length > 1 && parts[parts.length - 1].length === 3) {
      cleaned = cleaned.replace(/\./g, '');
    } else if (parts.length > 2) {
      cleaned = cleaned.replace(/\./g, '');
    }
  } else if (cleaned.includes(',')) {
    // Jika koma sebagai pemisah ribuan atau desimal
    const parts = cleaned.split(',');
    if (parts.length > 1 && parts[parts.length - 1].length === 3) {
      cleaned = cleaned.replace(/,/g, '');
    } else {
      cleaned = cleaned.replace(',', '.');
    }
  }

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}
