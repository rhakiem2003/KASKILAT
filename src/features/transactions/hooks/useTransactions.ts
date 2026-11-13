/**
 * @file useTransactions.ts
 * @description Hook React untuk membaca dan memfilter data transaksi kas masuk/keluar.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Transaction, TransactionFilter, TransactionSummary } from '../types/transaction.type';
import { getTransactions, deleteTransaction } from '../services/transaction.service';

export function useTransactions(initialFilter?: TransactionFilter) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<TransactionFilter>(initialFilter || { type: 'all' });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getTransactions(filter);
      setTransactions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat transaksi.');
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const summary = useMemo<TransactionSummary>(() => {
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
    let totalBalance = 0;
    let totalIncomeMonth = 0;
    let totalExpenseMonth = 0;
    let countMonth = 0;

    for (const tx of transactions) {
      if (tx.type === 'in') {
        totalBalance += tx.amount;
      } else {
        totalBalance -= tx.amount;
      }

      if (tx.transaction_date.startsWith(currentMonth)) {
        countMonth++;
        if (tx.type === 'in') {
          totalIncomeMonth += tx.amount;
        } else {
          totalExpenseMonth += tx.amount;
        }
      }
    }

    return {
      totalBalance,
      totalIncomeMonth,
      totalExpenseMonth,
      transactionCountMonth: countMonth,
    };
  }, [transactions]);

  const removeTransaction = async (id: string) => {
    try {
      await deleteTransaction(id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      throw err;
    }
  };

  return {
    transactions,
    isLoading,
    error,
    filter,
    setFilter,
    summary,
    refreshTransactions: fetchTransactions,
    deleteTransaction: removeTransaction,
  };
}
