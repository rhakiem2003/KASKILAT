/**
 * @file database-store.ts
 * @description Local-first application database. No sign-in, background redirect, or cloud sync.
 */

import type { AppSnapshot, KasKilatDatabase } from '../types/database.type';
import {
  GUEST_KEY,
  clearLegacyLocalData,
  getAllLocalRecords,
  getLocalRecord,
  putLocalRecord,
  readLegacyLocalData,
  userKey,
} from './local-database';
import { createTransactionId, mergeDatabases, normalizeDatabase, sortTransactions } from './database-utils';
import { createEmptyDatabase, type TemplateType } from '../../../lib/templates';
import { APP_CONFIG } from '../../../lib/constants';
import type {
  CreateTransactionInput,
  Transaction,
  TransactionFilter,
} from '../../transactions/types/transaction.type';
import type { CreateCategoryInput, Category } from '../../categories/types/category.type';

let snapshot: AppSnapshot = {
  status: 'loading',
  mode: 'guest',
  email: null,
  database: null,
  sync: { phase: 'local', lastSyncedAt: null },
  pendingUpgrade: null,
};

const listeners = new Set<() => void>();

function setSnapshot(patch: Partial<AppSnapshot>): void {
  snapshot = { ...snapshot, ...patch };
  for (const listener of listeners) listener();
}

export function getSnapshot(): AppSnapshot {
  return snapshot;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function nowIso(): string {
  return new Date().toISOString();
}

async function persistDatabase(database: KasKilatDatabase): Promise<void> {
  await putLocalRecord({
    key: GUEST_KEY,
    database,
    pendingSync: false,
    lastSyncedAt: null,
    updatedAt: Date.now(),
  });
}

function readLegacyGoogleEmail(): string | null {
  try {
    const raw = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.LEGACY_GOOGLE_SESSION);
    if (!raw) return null;
    const value = JSON.parse(raw) as { email?: unknown };
    return typeof value.email === 'string' && value.email.trim()
      ? value.email.trim().toLowerCase()
      : null;
  } catch {
    return null;
  }
}

function clearLegacyGoogleSession(): void {
  try {
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.GOOGLE_SESSION);
  } catch {
    // Local database does not depend on localStorage.
  }
}

let initPromise: Promise<void> | null = null;

export function initializeApp(): Promise<void> {
  if (!initPromise) initPromise = initializeLocalDatabase();
  return initPromise;
}

/**
 * Migrate the old local cache without deleting its original account-keyed record.
 * When both guest and account caches exist, merge their distinct IDs and keep both
 * source records untouched so a future recovery remains possible.
 */
async function initializeLocalDatabase(): Promise<void> {
  setSnapshot({ status: 'loading' });

  try {
    const guest = await getLocalRecord(GUEST_KEY);
    const oldEmail = readLegacyGoogleEmail();
    const accountRecords = (await getAllLocalRecords()).filter(
      (record) => record.key.startsWith('user_') && Boolean(record.database)
    );
    // If the old session was already logged out, migrate an account cache only when
    // exactly one exists. Never guess between multiple people's Google profiles.
    const oldAccount = oldEmail
      ? (accountRecords.find((record) => record.key === userKey(oldEmail)) ?? null)
      : accountRecords.length === 1
        ? accountRecords[0]
        : null;

    if (guest?.database || oldAccount?.database) {
      const database = guest?.database && oldAccount?.database
        ? mergeDatabases(guest.database, oldAccount.database)
        : (guest?.database ?? oldAccount?.database)!;

      await persistDatabase(database);
      setSnapshot({
        status: 'ready',
        mode: 'guest',
        email: null,
        database,
        sync: { phase: 'local', lastSyncedAt: null },
        pendingUpgrade: null,
      });
      clearLegacyGoogleSession();
      return;
    }

    const legacy = readLegacyLocalData();
    if (legacy) {
      await persistDatabase(legacy);
      clearLegacyLocalData();
      setSnapshot({
        status: 'ready',
        mode: 'guest',
        email: null,
        database: legacy,
        sync: { phase: 'local', lastSyncedAt: null },
        pendingUpgrade: null,
      });
      clearLegacyGoogleSession();
      return;
    }

    clearLegacyGoogleSession();
    setSnapshot({
      status: 'onboarding',
      mode: 'guest',
      email: null,
      database: null,
      sync: { phase: 'local', lastSyncedAt: null },
      pendingUpgrade: null,
    });
  } catch (error) {
    console.error('[DB] Gagal menyiapkan penyimpanan lokal:', error);
    setSnapshot({
      status: 'onboarding',
      mode: 'guest',
      email: null,
      database: null,
      sync: { phase: 'offline', lastSyncedAt: null },
      pendingUpgrade: null,
    });
  }
}

export async function startAsGuest(template: TemplateType = 'umkm'): Promise<void> {
  const existing = await getLocalRecord(GUEST_KEY);
  if (existing?.database) {
    setSnapshot({
      status: 'ready',
      mode: 'guest',
      email: null,
      database: existing.database,
      sync: { phase: 'local', lastSyncedAt: null },
      pendingUpgrade: null,
    });
    return;
  }

  const database = createEmptyDatabase(template);
  await persistDatabase(database);
  setSnapshot({
    status: 'ready',
    mode: 'guest',
    email: null,
    database,
    sync: { phase: 'local', lastSyncedAt: null },
    pendingUpgrade: null,
  });
}

async function commitDatabase(next: KasKilatDatabase): Promise<void> {
  const database = { ...next, lastUpdated: nowIso() };
  setSnapshot({
    status: 'ready',
    mode: 'guest',
    email: null,
    database,
    sync: { phase: 'local', lastSyncedAt: null },
    pendingUpgrade: null,
  });
  await persistDatabase(database);
}

/** Replace the active local database after an explicit backup restore. */
export async function restoreDatabase(database: KasKilatDatabase): Promise<void> {
  await commitDatabase(database);
}

function requireDatabase(): KasKilatDatabase {
  if (!snapshot.database) throw new Error('Database belum siap.');
  return snapshot.database;
}

export async function addTransaction(input: CreateTransactionInput): Promise<Transaction> {
  const database = requireDatabase();
  const transaction: Transaction = {
    ...input,
    id: input.id ?? createTransactionId(),
    amount: Number(input.amount) || 0,
    created_at: new Date().toISOString(),
  };
  await commitDatabase({
    ...database,
    transactions: sortTransactions([transaction, ...database.transactions]),
  });
  return transaction;
}

export async function updateTransaction(
  id: string,
  patch: Partial<CreateTransactionInput>
): Promise<Transaction | null> {
  const database = requireDatabase();
  const existing = database.transactions.find((tx) => tx.id === id);
  if (!existing) return null;
  const updated: Transaction = { ...existing, ...patch, id };
  await commitDatabase({
    ...database,
    transactions: sortTransactions(
      database.transactions.map((tx) => (tx.id === id ? updated : tx))
    ),
  });
  return updated;
}

export async function deleteTransaction(id: string): Promise<void> {
  const database = requireDatabase();
  await commitDatabase({
    ...database,
    transactions: database.transactions.filter((tx) => tx.id !== id),
  });
}

export async function addCategory(input: CreateCategoryInput): Promise<Category> {
  const database = requireDatabase();
  const category: Category = {
    id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: input.name.trim(),
    type: input.type,
    color: input.color,
    icon: input.icon,
    created_at: nowIso(),
  };
  await commitDatabase({ ...database, categories: [...database.categories, category] });
  return category;
}

export async function deleteCategory(id: string): Promise<void> {
  const database = requireDatabase();
  await commitDatabase({
    ...database,
    categories: database.categories.filter((category) => category.id !== id),
    transactions: database.transactions.map((tx) =>
      tx.category_id === id ? { ...tx, category_id: undefined } : tx
    ),
  });
}

export function countLocalPhotos(): number {
  return (
    snapshot.database?.transactions.filter((tx) => tx.photo_url?.startsWith('local://'))
      .length ?? 0
  );
}

export function filterTransactions(
  transactions: Transaction[],
  filter: TransactionFilter
): Transaction[] {
  const query = filter.searchQuery?.trim().toLowerCase();
  return transactions.filter((tx) => {
    if (filter.type && filter.type !== 'all' && tx.type !== filter.type) return false;
    if (filter.startDate && tx.transaction_date < filter.startDate) return false;
    if (filter.endDate && tx.transaction_date > filter.endDate) return false;
    if (filter.categoryId && tx.category_id !== filter.categoryId) return false;
    if (query) {
      const haystack = `${tx.merchant ?? ''} ${tx.description ?? ''}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

export function normalizeImportedDatabase(raw: unknown): KasKilatDatabase | null {
  return normalizeDatabase(raw);
}

export function mergeWithCurrentDatabase(incoming: KasKilatDatabase): KasKilatDatabase {
  const current = snapshot.database;
  return current ? mergeDatabases(current, incoming) : incoming;
}
