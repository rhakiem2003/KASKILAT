/**
 * @file local-database.ts
 * @description Penyimpanan database utama di IndexedDB (offline-first, selalu instan).
 * Kunci tamu memakai prefix `guest_`; akun Google memakai `user_<email>`.
 */

import { KasKilatDatabase } from '../types/database.type';
import { APP_CONFIG } from '../../../lib/constants';
import { Category } from '../../categories/types/category.type';
import { Transaction } from '../../transactions/types/transaction.type';
import { createTemplateCategories } from '../../../lib/templates';

const DB_NAME = 'kaskilat_app';
const DB_VERSION = 1;
const STORE_NAME = 'databases';

export const GUEST_KEY = 'guest_database';

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
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Gagal membuka IndexedDB.'));
    });
  }
  return dbPromise;
}

async function run<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const request = operation(tx.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Operasi database lokal gagal.'));
  });
}

export function userKey(email: string): string {
  return `user_${email.trim().toLowerCase()}`;
}

export async function getLocalRecord(key: string): Promise<LocalDatabaseRecord | null> {
  const record = await run<LocalDatabaseRecord | undefined>('readonly', (store) => store.get(key));
  return record ?? null;
}

export async function getAllLocalRecords(): Promise<LocalDatabaseRecord[]> {
  return run<LocalDatabaseRecord[]>('readonly', (store) => store.getAll());
}

export async function putLocalRecord(record: LocalDatabaseRecord): Promise<void> {
  await run('readwrite', (store) => store.put(record));
}

export async function deleteLocalRecord(key: string): Promise<void> {
  await run('readwrite', (store) => store.delete(key));
}

/**
 * Impor data dari versi lama (localStorage) sekali saja agar pengguna lama tidak kehilangan catatan.
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
      categories:
        categories.length > 0 ? categories : createTemplateCategories('umkm', now),
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
    // localStorage bisa diblokir; abaikan
  }
}
