/**
 * @file local-database.ts
 * @description IndexedDB storage for local-first records and migration metadata.
 */

import type { KasKilatDatabase } from '../types/database.type';
import { APP_CONFIG } from '../../../lib/constants';
import type { Category } from '../../categories/types/category.type';
import type { Transaction } from '../../transactions/types/transaction.type';
import { createTemplateCategories } from '../../../lib/templates';

const DB_NAME = 'kaskilat_app';
const DB_VERSION = 2;
const STORE_NAME = 'databases';
const META_STORE_NAME = 'metadata';

export const GUEST_KEY = 'guest_database';
export const ACCOUNT_CACHE_MIGRATION_KEY = 'local_first_account_cache_migrated_v1';

export interface LocalDatabaseRecord {
  key: string;
  database: KasKilatDatabase;
  pendingSync: boolean;
  lastSyncedAt: string | null;
  updatedAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB tidak tersedia di browser ini.'));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(META_STORE_NAME)) {
          db.createObjectStore(META_STORE_NAME, { keyPath: 'key' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        dbPromise = null;
        reject(request.error || new Error('Gagal membuka IndexedDB.'));
      };
      request.onblocked = () => {
        dbPromise = null;
        reject(new Error('Database sedang dipakai tab lain. Tutup tab KasKilat lain lalu coba lagi.'));
      };
    });
  }
  return dbPromise;
}

async function run<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    let request: IDBRequest<T>;
    let result: T;
    let settled = false;
    const tx = db.transaction(storeName, mode);

    const fail = (error: DOMException | Error | null | undefined) => {
      if (settled) return;
      settled = true;
      reject(error || new Error('Operasi database lokal gagal.'));
    };

    try {
      request = operation(tx.objectStore(storeName));
    } catch (error) {
      try { tx.abort(); } catch { /* transaction may already be inactive */ }
      fail(error instanceof Error ? error : new Error('Operasi database lokal gagal.'));
      return;
    }

    request.onsuccess = () => {
      result = request.result;
    };
    request.onerror = () => fail(request.error);
    tx.oncomplete = () => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    tx.onerror = () => fail(tx.error || request.error);
    tx.onabort = () => fail(tx.error || request.error || new Error('Transaksi IndexedDB dibatalkan.'));
  });
}

export function userKey(email: string): string {
  return `user_${email.trim().toLowerCase()}`;
}

export async function getLocalRecord(key: string): Promise<LocalDatabaseRecord | null> {
  const record = await run<LocalDatabaseRecord | undefined>(
    STORE_NAME,
    'readonly',
    (store) => store.get(key)
  );
  return record ?? null;
}

export async function getAllLocalRecords(): Promise<LocalDatabaseRecord[]> {
  return run<LocalDatabaseRecord[]>(STORE_NAME, 'readonly', (store) => store.getAll());
}

export async function putLocalRecord(record: LocalDatabaseRecord): Promise<void> {
  await run<IDBValidKey>(STORE_NAME, 'readwrite', (store) => store.put(record));
}

/** Persist the migrated guest database and completion marker in one atomic transaction. */
export async function putLocalRecordWithMetadata<T>(
  record: LocalDatabaseRecord,
  metadataKey: string,
  metadataValue: T
): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE_NAME, META_STORE_NAME], 'readwrite');
    tx.objectStore(STORE_NAME).put(record);
    tx.objectStore(META_STORE_NAME).put({ key: metadataKey, value: metadataValue });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Gagal menyimpan migrasi lokal.'));
    tx.onabort = () => reject(tx.error || new Error('Migrasi lokal dibatalkan.'));
  });
}

export async function deleteLocalRecord(key: string): Promise<void> {
  await run<undefined>(STORE_NAME, 'readwrite', (store) => store.delete(key));
}

export async function getLocalMetadata<T = unknown>(key: string): Promise<T | null> {
  const record = await run<{ key: string; value: T } | undefined>(
    META_STORE_NAME,
    'readonly',
    (store) => store.get(key)
  );
  return record?.value ?? null;
}

export async function putLocalMetadata<T = unknown>(key: string, value: T): Promise<void> {
  await run<IDBValidKey>(META_STORE_NAME, 'readwrite', (store) => store.put({ key, value }));
}

/**
 * Import previous localStorage records. The source is cleared only after the new
 * IndexedDB record has committed successfully.
 */
export function readLegacyLocalData(): KasKilatDatabase | null {
  if (typeof localStorage === 'undefined') return null;

  try {
    const rawTransactions = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.LEGACY_TRANSACTIONS);
    const rawCategories = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.LEGACY_CATEGORIES);
    if (rawTransactions === null && rawCategories === null) return null;

    const transactions = rawTransactions ? (JSON.parse(rawTransactions) as Transaction[]) : [];
    const categories = rawCategories ? (JSON.parse(rawCategories) as Category[]) : [];
    if (!Array.isArray(transactions) || !Array.isArray(categories)) return null;

    const now = new Date().toISOString();
    return {
      version: 1,
      transactions: transactions.filter((tx) => tx && typeof tx.id === 'string'),
      categories: categories.length > 0 ? categories : createTemplateCategories('umkm', now),
      lastUpdated: now,
      template: 'umkm',
    };
  } catch {
    return null;
  }
}

export function clearLegacyLocalData(): void {
  try {
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.LEGACY_TRANSACTIONS);
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.LEGACY_CATEGORIES);
  } catch {
    // localStorage may be blocked; the IndexedDB copy is already committed.
  }
}
