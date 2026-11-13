/**
 * @file useCreateTransaction.ts
 * @description Hook React untuk menyimpan atau memperbarui transaksi kas.
 */

import { useState } from 'react';
import { CreateTransactionInput, Transaction } from '../types/transaction.type';
import { createTransaction, updateTransaction } from '../services/transaction.service';

export function useCreateTransaction() {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const saveTransaction = async (input: CreateTransactionInput): Promise<Transaction> => {
    setIsSubmitting(true);
    setError(null);
    try {
      const saved = await createTransaction(input);
      return saved;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan transaksi.';
      setError(msg);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const editTransaction = async (
    id: string,
    input: Partial<CreateTransactionInput>
  ): Promise<Transaction | null> => {
    setIsSubmitting(true);
    setError(null);
    try {
      const updated = await updateTransaction(id, input);
      return updated;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui transaksi.';
      setError(msg);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    saveTransaction,
    editTransaction,
    isSubmitting,
    error,
  };
}
