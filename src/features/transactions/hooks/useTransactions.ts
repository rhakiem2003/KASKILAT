/**
 * @file useTransactions.ts
 * @description Hook React untuk membaca, memfilter, dan merangkum transaksi dari database-store.
 */

import { useMemo, useState } from 'react';
import type {
  TransactionFilter,
  TransactionSummary,
} from '../types/transaction.type';
import { useAppDatabase } from '../../database/hooks/useAppDatabase';
import {
  deleteTransaction as removeTransaction,
  filterTransactions,
} from '../../database/services/database-store';

export function useTransactions(initialFilter?: TransactionFilter) {
  const { database, status } = useAppDatabase();
  const [filter, setFilter] = useState<TransactionFilter>(initialFilter || { type: 'all' });

  const isLoading = status === 'loading';
  const transactions = useMemo(() => {
    if (!database) return [];
    return filterTransactions(database.transactions, filter);
  }, [database, filter]);

  const summary = useMemo<TransactionSummary>(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; // local YYYY-MM
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

  const deleteTransaction = async (id: string) => {
    await removeTransaction(id);
  };

  return {
    transactions,
    isLoading,
    error: null,
    filter,
    setFilter,
    summary,
    refreshTransactions: () => undefined,
    deleteTransaction,
  };
}
