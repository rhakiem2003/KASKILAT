/**
 * @file category-suggestions.ts
 * @description Tebak kategori dari teks struk memakai if/regex biasa (tanpa AI).
 */

import type { Category } from '../../categories/types/category.type';
import type { TransactionType } from '../../transactions/types/transaction.type';

interface Rule {
  pattern: RegExp;
  names: RegExp[];
}

const RULES: Rule[] = [
  {
    pattern: /gopay|ovo|dana|shopeepay|qris|dompet digital/i,
    names: [/e-?wallet|dompet/i, /transport/i],
  },
  {
    pattern: /bca|bri|mandiri|bni|transfer berhasil|m-?banking|bank/i,
    names: [/transfer/i, /piutang/i, /pendapatan lain/i],
  },
  {
    pattern: /shopee|tokopedia|lazada|tiktok shop|grab|gojek/i,
    names: [/belanja/i, /stok/i, /transport/i],
  },
  {
    pattern: /makan|minum|warung|resto|restoran|kafe|coffee|bakso|nasi/i,
    names: [/makan|minum/i],
  },
  {
    pattern: /pulsa|telkomsel|indosat|\bxl\b|tri\b|internet|wifi|indihome/i,
    names: [/pulsa|internet/i],
  },
  {
    pattern: /pln|listrik|pdam|\bair\b/i,
    names: [/listrik|air|operasional/i],
  },
  {
    pattern: /bensin|pertalite|pertamax|spbu|parkir|tol\b/i,
    names: [/transport|bensin/i],
  },
  {
    pattern: /apotek|klinik|rumah sakit|dokter|obat/i,
    names: [/kesehatan/i],
  },
  {
    pattern: /gaji|payroll|upah/i,
    names: [/gaji|upah/i],
  },
  {
    pattern: /sewa|kontrakan|kos\b/i,
    names: [/sewa/i],
  },
];

/**
 * Mengembalikan id kategori yang paling mungkin dari teks struk.
 * Aturan hanya dipakai bila kategori dengan nama terkait memang ada.
 */
export function suggestCategoryId(
  text: string,
  type: TransactionType,
  categories: Category[]
): string | null {
  if (!text) return null;
  const candidates = categories.filter((category) => category.type === type);
  if (candidates.length === 0) return null;

  for (const rule of RULES) {
    if (!rule.pattern.test(text)) continue;
    for (const namePattern of rule.names) {
      const match = candidates.find((category) => namePattern.test(category.name));
      if (match) return match.id;
    }
  }

  return null;
}
