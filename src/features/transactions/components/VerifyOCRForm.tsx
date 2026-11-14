/**
 * @file VerifyOCRForm.tsx
 * @description Formulir verifikasi data hasil OCR yang terisi otomatis untuk disunting user sebelum simpan.
 */

import React, { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Check, Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Category } from '../../categories/types/category.type';
import { TransactionType, CreateTransactionInput } from '../types/transaction.type';
import { ParsedOCRData } from '../../ocr/types/ocr.type';
import { PAYMENT_METHODS, PaymentMethod } from '../../../lib/constants';
import { formatRupiah, parseRupiah } from '../utils/formatRupiah';

interface VerifyOCRFormProps {
  parsedData: ParsedOCRData | null;
  categories: Category[];
  photoUrl?: string;
  suggestedCategoryId?: string | null;
  isSubmitting?: boolean;
  onSave: (transactionData: CreateTransactionInput) => void;
  onCancel: () => void;
}

export const VerifyOCRForm: React.FC<VerifyOCRFormProps> = ({
  parsedData,
  categories,
  photoUrl,
  suggestedCategoryId,
  isSubmitting = false,
  onSave,
  onCancel,
}) => {
  const [type, setType] = useState<TransactionType>(parsedData?.detectedType || 'out');
  const [amountStr, setAmountStr] = useState<string>(
    parsedData?.amount ? formatRupiah(parsedData.amount, false) : ''
  );
  const [date, setDate] = useState<string>(
    parsedData?.date || new Date().toISOString().split('T')[0]
  );
  const [merchant, setMerchant] = useState<string>(parsedData?.merchant || '');
  const [description, setDescription] = useState<string>(parsedData?.description || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | string>(
    parsedData?.paymentMethod || 'Tunai'
  );

  // Kategori yang cocok dengan jenis transaksi saat ini (in / out)
  const filteredCategories = categories.filter((c) => c.type === type);
  const suggested = filteredCategories.find((c) => c.id === suggestedCategoryId);
  const [categoryId, setCategoryId] = useState<string>(
    suggested?.id || filteredCategories[0]?.id || ''
  );

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    const newFiltered = categories.filter((c) => c.type === newType);
    if (newFiltered.length > 0) {
      setCategoryId(newFiltered[0].id);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Titik pemisah ribuan ikut terketik ulang, jadi hanya digit yang dihitung.
    const digits = e.target.value.replace(/\D/g, '');
    setAmountStr(digits ? formatRupiah(Number(digits), false) : '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = parseRupiah(amountStr);
    if (finalAmount <= 0) return;

    onSave({
      type,
      amount: finalAmount,
      transaction_date: date,
      merchant: merchant.trim() || undefined,
      description: description.trim() || undefined,
      category_id: categoryId || undefined,
      payment_method: paymentMethod,
      photo_url: photoUrl,
      ocr_raw_text: parsedData?.rawText,
      ocr_confidence: parsedData?.confidence,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Tombol Segmented Kas Masuk vs Kas Keluar */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
        <button
          type="button"
          onClick={() => handleTypeChange('in')}
          className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
            type === 'in'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4" />
          Kas Masuk (In)
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange('out')}
          className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
            type === 'out'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          Kas Keluar (Out)
        </button>
      </div>

      {/* Input Nominal Rupiah */}
      <Input
        label="Nominal Transaksi (Rp)"
        value={amountStr}
        onChange={handleAmountChange}
        placeholder="0"
        required
        leftPrefix="Rp"
        className="text-base font-bold tabular-nums"
        helperText="Otomatis terbaca dari struk. Bisa diedit jika ada selisih."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          type="date"
          label="Tanggal Transaksi"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />

        <Input
          label="Toko / Pengirim / Penerima"
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          placeholder="Cth: Indomaret, Toko Sembako, Pelanggan"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Pilihan Kategori */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Kategori
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full h-11 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm px-3.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          >
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Metode Pembayaran */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Metode Pembayaran
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            className="w-full h-11 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm px-3.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Catatan / Keterangan Tambahan */}
      <Input
        label="Catatan Tambahan (Opsional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Cth: Minyak Goreng (2x) = Rp 68.000; Gula Pasir (3x) = Rp 49.500"
        helperText="Otomatis diisi dari rincian barang, jumlah, dan harga pada struk. Tetap bisa diedit."
      />

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-2.5 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Batal
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
          leftIcon={<Check className="w-4 h-4" />}
        >
          Simpan ke Buku Kas
        </Button>
      </div>
    </form>
  );
};
