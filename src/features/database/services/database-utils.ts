/**
 * @file database-utils.ts
 * @description Validation, merging, and ordering for KasKilat databases.
 */

import type { KasKilatDatabase } from '../types/database.type';
import type { Transaction } from '../../transactions/types/transaction.type';
import type { Category } from '../../categories/types/category.type';
import { isTemplateType } from '../../../lib/templates';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string';
}

function isOptionalNullableString(value: unknown): boolean {
  return value === undefined || value === null || typeof value === 'string';
}

function isValidTransaction(value: unknown): value is Transaction {
  if (!isObject(value)) return false;
  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    (value.type === 'in' || value.type === 'out') &&
    Number.isFinite(Number(value.amount)) &&
    typeof value.transaction_date === 'string' &&
    value.transaction_date.length > 0 &&
    typeof value.payment_method === 'string' &&
    isOptionalNullableString(value.user_id) &&
    isOptionalString(value.description) &&
    isOptionalString(value.merchant) &&
    isOptionalString(value.category_id) &&
    isOptionalString(value.photo_url) &&
    isOptionalString(value.ocr_raw_text) &&
    (value.ocr_confidence === undefined ||
      (typeof value.ocr_confidence === 'number' && Number.isFinite(value.ocr_confidence))) &&
    isOptionalString(value.created_at)
  );
}

function isValidCategory(value: unknown): value is Category {
  if (!isObject(value)) return false;
  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.name === 'string' &&
    (value.type === 'in' || value.type === 'out') &&
    typeof value.color === 'string' &&
    typeof value.icon === 'string' &&
    isOptionalNullableString(value.user_id) &&
    isOptionalString(value.created_at)
  );
}

export function sortTransactions(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => {
    if (a.transaction_date !== b.transaction_date) {
      return a.transaction_date > b.transaction_date ? -1 : 1;
    }
    return (b.created_at || '').localeCompare(a.created_at || '');
  });
}

/**
 * Reject malformed imports rather than silently dropping fields or accepting values
 * that later UI code expects to be strings (e.g. photo_url and merchant).
 */
export function normalizeDatabase(raw: unknown): KasKilatDatabase | null {
  if (!isObject(raw)) return null;
  const candidate = raw as Partial<KasKilatDatabase>;

  if (
    !Array.isArray(candidate.transactions) ||
    !Array.isArray(candidate.categories) ||
    !candidate.transactions.every(isValidTransaction) ||
    !candidate.categories.every(isValidCategory)
  ) {
    return null;
  }

  const transactions = candidate.transactions.map((tx) => ({
    ...tx,
    amount: Number(tx.amount),
  }));

  return {
    version: 1,
    transactions: sortTransactions(transactions),
    categories: candidate.categories,
    lastUpdated:
      typeof candidate.lastUpdated === 'string'
        ? candidate.lastUpdated
        : new Date().toISOString(),
    template: isTemplateType(candidate.template) ? candidate.template : undefined,
  };
}

/**
 * Merge backup data with active data. Existing device records win duplicate IDs.
 */
export function mergeDatabases(
  base: KasKilatDatabase,
  incoming: KasKilatDatabase
): KasKilatDatabase {
  const transactionMap = new Map<string, Transaction>();
  for (const tx of incoming.transactions) transactionMap.set(tx.id, tx);
  for (const tx of base.transactions) transactionMap.set(tx.id, tx);

  const categoryMap = new Map<string, Category>();
  for (const category of incoming.categories) categoryMap.set(category.id, category);
  for (const category of base.categories) categoryMap.set(category.id, category);

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
