/**
 * @file VerifyOCRForm.tsx
 * @description Editable OCR form with unobtrusive defaults learned from the user's own history.
 */

import React, { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Check } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import type { Category } from '../../categories/types/category.type';
import type { TransactionType, CreateTransactionInput } from '../types/transaction.type';
import type { ParsedOCRData } from '../../ocr/types/ocr.type';
import { PAYMENT_METHODS, type PaymentMethod } from '../../../lib/constants';
import { formatRupiah, parseRupiah } from '../utils/formatRupiah';
import { useAppDatabase } from '../../database/hooks/useAppDatabase';

interface VerifyOCRFormProps {
  parsedData: ParsedOCRData | null;
  categories: Category[];
  photoUrl?: string;
  suggestedCategoryId?: string | null;
  isSubmitting?: boolean;
  onSave: (transactionData: CreateTransactionInput) => void;
  onCancel: () => void;
}

function localDateString(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeMerchant(value: string): string {
  return value.trim().toLocaleLowerCase('id-ID').replace(/[^\p{L}\p{N}]+/gu, ' ');
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
  const { database } = useAppDatabase();
  const [type, setType] = useState<TransactionType>(parsedData?.detectedType || 'out');
  const [amountStr, setAmountStr] = useState<string>(
    parsedData?.amount ? formatRupiah(parsedData.amount, false) : ''
  );
  const [date, setDate] = useState<string>(parsedData?.date || localDateString());
  const [merchant, setMerchant] = useState<string>(parsedData?.merchant || '');
  const [description, setDescription] = useState<string>(parsedData?.description || '');

  const learnedDefaults = useMemo(() => {
    const history = database?.transactions ?? [];
    const merchantKey = normalizeMerchant(parsedData?.merchant || '');
    const sameMerchant = merchantKey
      ? history.find((tx) =>
          tx.type === type &&
          normalizeMerchant(tx.merchant || '') === merchantKey &&
          Boolean(tx.category_id)
        )
      : undefined;

    const categoryCounts = new Map<string, number>();
    for (const tx of history) {
      if (tx.type === type && tx.category_id) {
        categoryCounts.set(tx.category_id, (categoryCounts.get(tx.category_id) ?? 0) + 1);
      }
    }
    const frequentCategory = [...categoryCounts.entries()]
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    const recentPayment = history.find((tx) => tx.type === type && tx.payment_method);
    return {
      categoryId: sameMerchant?.category_id || suggestedCategoryId || frequentCategory || '',
      paymentMethod: parsedData?.paymentMethod || recentPayment?.payment_method || 'Tunai',
    };
  }, [database, parsedData, suggestedCategoryId, type]);

  const filteredCategories = categories.filter((category) => category.type === type);
  const [categoryId, setCategoryId] = useState<string>(learnedDefaults.categoryId);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | string>(
    learnedDefaults.paymentMethod
  );

  // Adjust only when the transaction direction changes. OCR and learned merchant defaults
  // initialize the form, but never overwrite a choice the user is already making.
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    const nextCategories = categories.filter((category) => category.type === newType);
    const recentHistory = database?.transactions ?? [];
    const merchantKey = normalizeMerchant(merchant);
    const learnedForMerchant = merchantKey
      ? recentHistory.find((tx) =>
          tx.type === newType &&
          normalizeMerchant(tx.merchant || '') === merchantKey &&
          Boolean(tx.category_id)
        )?.category_id
      : undefined;
    const mostFrequent = recentHistory.find((tx) => tx.type === newType && tx.category_id)?.category_id;
    setCategoryId(
      learnedForMerchant ||
      (newType === parsedData?.detectedType ? suggestedCategoryId : undefined) ||
      mostFrequent ||
      nextCategories[0]?.id ||
      ''
    );
    const recentPayment = recentHistory.find((tx) => tx.type === newType && tx.payment_method);
    if (recentPayment) setPaymentMethod(recentPayment.payment_method);
  };

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const digits = event.target.value.replace(/\D/g, '');
    setAmountStr(digits ? formatRupiah(Number(digits), false) : '');
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
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
          Kas Masuk
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
          Kas Keluar
        </button>
      </div>

      <Input
        label="Nominal Transaksi (Rp)"
        value={amountStr}
        onChange={handleAmountChange}
        placeholder="0"
        required
        leftPrefix="Rp"
        className="text-base font-bold tabular-nums"
        helperText="Otomatis terbaca dari gambar. Bisa diedit jika ada selisih."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          type="date"
          label="Tanggal Transaksi"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          required
        />
        <Input
          label="Toko / Pengirim / Penerima"
          value={merchant}
          onChange={(event) => setMerchant(event.target.value)}
          placeholder="Cth: Indomaret, Toko Sembako, Pelanggan"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Kategori
          </label>
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="w-full h-11 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm px-3.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          >
            {filteredCategories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Metode Pembayaran
          </label>
          <select
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
            className="w-full h-11 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm px-3.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          >
            {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}
          </select>
        </div>
      </div>

      <Input
        label="Catatan Tambahan (Opsional)"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="Cth: Minyak Goreng (2x) = Rp 68.000"
        helperText="Boleh dikosongkan. Isi hanya jika ada catatan tambahan."
      />

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
