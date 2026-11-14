/**
 * @file transaction.service.ts
 * @description Layanan transaksi yang diteruskan ke database-store (IndexedDB + Drive).
 */

import type {
  CreateTransactionInput,
  Transaction,
  TransactionFilter,
} from '../types/transaction.type';
import {
  addTransaction,
  deleteTransaction as removeTransaction,
  filterTransactions,
  getSnapshot,
  updateTransaction as patchTransaction,
} from '../../database/services/database-store';

export async function getTransactions(filter?: TransactionFilter): Promise<Transaction[]> {
  const database = getSnapshot().database;
  if (!database) return [];

  const list = filter ? filterTransactions(database.transactions, filter) : database.transactions;
  return [...list];
}

export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  return addTransaction(input);
}

export async function updateTransaction(
  id: string,
  input: Partial<CreateTransactionInput>
): Promise<Transaction | null> {
  return patchTransaction(id, input);
}

export async function deleteTransaction(id: string): Promise<boolean> {
  await removeTransaction(id);
  return true;
}
