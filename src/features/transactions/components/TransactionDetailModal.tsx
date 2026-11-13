/**
 * @file TransactionDetailModal.tsx
 * @description Modal detail transaksi dengan preview foto bukti struk dan aksi hapus/edit.
 */

import React, { useState } from 'react';
import { Trash2, Calendar, Store, CreditCard, Tag, FileText, Loader2 } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Transaction } from '../types/transaction.type';
import { Category } from '../../categories/types/category.type';
import { formatRupiah } from '../utils/formatRupiah';
import { formatIndonesianDate } from '../utils/dateFormatter';
import { usePhotoUrl } from '../../storage/hooks/usePhotoUrl';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  category?: Category;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  category,
  isOpen,
  onClose,
  onDelete,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const { url: photoUrl, isLoading: isPhotoLoading, error: photoError } = usePhotoUrl(
    transaction?.photo_url
  );

  if (!transaction) return null;
  const isIncome = transaction.type === 'in';

  const handleDelete = async () => {
    if (!window.confirm('Hapus transaksi ini dari buku kas?')) return;
    setIsDeleting(true);
    try {
      await onDelete(transaction.id);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isIncome ? 'Detail Kas Masuk' : 'Detail Kas Keluar'}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Nominal Besar */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-center">
          <span className="text-xs text-slate-500 font-medium">Nominal Transaksi</span>
          <p
            className={`text-2xl font-bold tabular-nums mt-0.5 ${
              isIncome ? 'text-emerald-600' : 'text-slate-900 dark:text-slate-100'
            }`}
          >
            {isIncome ? '+' : '-'}{formatRupiah(transaction.amount)}
          </p>
          <span className="text-xs text-slate-400 font-mono">
            {isIncome ? 'Penerimaan / Omzet Kas' : 'Pengeluaran / Biaya Usaha'}
          </span>
        </div>

        {/* Informasi Detail */}
        <div className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
            <span className="flex items-center gap-1.5 text-slate-500">
              <Calendar className="w-4 h-4" /> Tanggal
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {formatIndonesianDate(transaction.transaction_date, false)}
            </span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
            <span className="flex items-center gap-1.5 text-slate-500">
              <Store className="w-4 h-4" /> Toko / Pihak Terkait
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {transaction.merchant || '-'}
            </span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
            <span className="flex items-center gap-1.5 text-slate-500">
              <Tag className="w-4 h-4" /> Kategori
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {category?.name || '-'}
            </span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
            <span className="flex items-center gap-1.5 text-slate-500">
              <CreditCard className="w-4 h-4" /> Metode Bayar
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {transaction.payment_method}
            </span>
          </div>

          {transaction.description && (
            <div className="py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 block mb-0.5">Catatan</span>
              <p className="text-slate-700 dark:text-slate-300">
                {transaction.description}
              </p>
            </div>
          )}
        </div>

        {/* Foto Struk Bukti jika ada */}
        {transaction.photo_url && (
          <div className="pt-1">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
              Foto Bukti Transaksi:
            </span>
            <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-56 bg-slate-900/5 flex items-center justify-center min-h-24">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt="Foto Struk"
                  className="w-full h-48 object-contain"
                />
              ) : isPhotoLoading ? (
                <div className="flex items-center gap-2 text-xs text-slate-500 py-6">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Memuat foto struk...
                </div>
              ) : (
                <p className="px-4 py-6 text-[11px] text-slate-500 text-center">
                  {photoError ||
                    'Foto tersimpan di Google Drive dan belum tersedia offline. Hubungkan Google Drive di Pengaturan untuk melihatnya.'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Action button Hapus */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            isLoading={isDeleting}
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            Hapus Transaksi
          </Button>

          <Button variant="outline" size="sm" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </Modal>
  );
};
