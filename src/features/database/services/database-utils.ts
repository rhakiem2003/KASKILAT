/**
 * @file database-utils.ts
 * @description Validasi, penggabungan, dan pengurutan database KasKilat.
 */

import { KasKilatDatabase } from '../types/database.type';
import { Transaction } from '../../transactions/types/transaction.type';
import { Category } from '../../categories/types/category.type';
import { isTemplateType } from '../../../lib/templates';

export function sortTransactions(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => {
    if (a.transaction_date !== b.transaction_date) {
      return a.transaction_date > b.transaction_date ? -1 : 1;
    }
    return (b.created_at || '').localeCompare(a.created_at || '');
  });
}

export function normalizeDatabase(raw: unknown): KasKilatDatabase | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Partial<KasKilatDatabase>;

  if (!Array.isArray(candidate.transactions) || !Array.isArray(candidate.categories)) {
    return null;
  }

  const transactions = candidate.transactions.filter(
    (tx): tx is Transaction =>
      Boolean(tx) &&
      typeof tx.id === 'string' &&
      (tx.type === 'in' || tx.type === 'out') &&
      Number.isFinite(Number(tx.amount))
  );
  const categories = candidate.categories.filter(
    (cat): cat is Category =>
      Boolean(cat) && typeof cat.id === 'string' && typeof cat.name === 'string'
  );

  return {
    version: 1,
    transactions: sortTransactions(transactions),
    categories,
    lastUpdated:
      typeof candidate.lastUpdated === 'string'
        ? candidate.lastUpdated
        : new Date().toISOString(),
    template: isTemplateType(candidate.template) ? candidate.template : undefined,
  };
}

/**
 * Gabungkan data tamu ke data Drive. ID yang sama dianggap transaksi yang sama.
 */
export function mergeDatabases(
  base: KasKilatDatabase,
  incoming: KasKilatDatabase
): KasKilatDatabase {
  const transactionMap = new Map<string, Transaction>();
  for (const tx of base.transactions) transactionMap.set(tx.id, tx);
  for (const tx of incoming.transactions) transactionMap.set(tx.id, tx);

  const categoryMap = new Map<string, Category>();
  for (const category of base.categories) categoryMap.set(category.id, category);
  for (const category of incoming.categories) categoryMap.set(category.id, category);

  return {
    version: 1,
    transactions: sortTransactions([...transactionMap.values()]),
    categories: [...categoryMap.values()],
    lastUpdated: new Date().toISOString(),
    template: base.template ?? incoming.template,
  };
}

export function createTransactionId(): string {
  return `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
