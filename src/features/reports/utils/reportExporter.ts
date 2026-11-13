/**
 * @file reportExporter.ts
 * @description Utilitas ekspor laporan buku kas ke format file CSV/Excel dan Cetak/PDF.
 */

import { Transaction } from '../../transactions/types/transaction.type';
import { Category } from '../../categories/types/category.type';
import { formatIndonesianDate } from '../../transactions/utils/dateFormatter';

/**
 * Mengekspor data transaksi ke file CSV (dapat langsung dibuka di Microsoft Excel atau Google Sheets)
 */
export function exportTransactionsToCSV(
  transactions: Transaction[],
  categories: Category[],
  reportTitle = 'Laporan_Kas_UMKM'
): void {
  const getCatName = (id?: string) => {
    return categories.find((c) => c.id === id)?.name || '-';
  };

  // Header CSV
  const headers = [
    'ID Transaksi',
    'Tanggal',
    'Tipe Kas',
    'Nominal (Rp)',
    'Toko / Pihak Terkait',
    'Kategori',
    'Metode Pembayaran',
    'Keterangan',
    'Akurasi OCR (%)',
  ];

  const rows = transactions.map((t) => [
    `"${t.id}"`,
    `"${t.transaction_date}"`,
    `"${t.type === 'in' ? 'Kas Masuk' : 'Kas Keluar'}"`,
    t.amount,
    `"${(t.merchant || '').replace(/"/g, '""')}"`,
    `"${getCatName(t.category_id).replace(/"/g, '""')}"`,
    `"${(t.payment_method || '').replace(/"/g, '""')}"`,
    `"${(t.description || '').replace(/"/g, '""')}"`,
    t.ocr_confidence || 0,
  ]);

  const csvContent =
    '\uFEFF' + // UTF-8 BOM agar aksen dan format terbaca rapi di Excel
    [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const nowStr = new Date().toISOString().split('T')[0];

  link.setAttribute('href', url);
  link.setAttribute('download', `${reportTitle}_${nowStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Memicu dialog cetak browser (User bisa pilih 'Save as PDF' / Cetak Fisik)
 */
export function triggerPrintReport(): void {
  window.print();
}
