/**
 * @file database-store.ts
 * @description Sumber kebenaran tunggal aplikasi: database aktif, mode tamu/akun,
 * penyimpanan IndexedDB instan, dan sinkronisasi Drive dengan debounce 3 detik.
 */

import type {
  AppMode,
  AppSnapshot,
  GuestUpgradeRequest,
  KasKilatDatabase,
  SyncState,
} from '../types/database.type';
import {
  GUEST_KEY,
  clearLegacyLocalData,
  deleteLocalRecord,
  getLocalRecord,
  putLocalRecord,
  readLegacyLocalData,
  userKey,
} from './local-database';
import {
  createTransactionId,
  mergeDatabases,
  normalizeDatabase,
  sortTransactions,
} from './database-utils';
import {
  connectGoogle,
  disconnectGoogle,
  ensureAccessToken,
  getSessionEmail,
  hasGoogleSession,
  isAccessTokenValid,
  isLongSessionEnabled,
  resolveRedirectLogin,
  startGoogleRedirect,
  startSilentGoogleRestore,
  takeRedirectError,
  takeRedirectIntent,
} from '../../auth/services/auth.service';
import {
  clearDriveCache,
  isDriveConnected,
  downloadDatabaseFromDrive,
  uploadDatabaseToDrive,
} from '../../storage/services/drive.service';
import {
  migratePhotoToDrive,
} from '../../storage/services/photo.service';
import { createEmptyDatabase, TemplateType } from '../../../lib/templates';
import { APP_CONFIG } from '../../../lib/constants';
import { showToast } from '../../../lib/toast';
import type {
  CreateTransactionInput,
  Transaction,
  TransactionFilter,
} from '../../transactions/types/transaction.type';
import type { CreateCategoryInput, Category } from '../../categories/types/category.type';

const SYNC_DEBOUNCE_MS = 3000;
const PENDING_TEMPLATE_KEY = 'kaskilat_google_pending_template';

function savePendingTemplate(template?: TemplateType): void {
  try {
    if (template) localStorage.setItem(PENDING_TEMPLATE_KEY, template);
    else localStorage.removeItem(PENDING_TEMPLATE_KEY);
  } catch {
    // abaikan
  }
}

function takePendingTemplate(): TemplateType | undefined {
  try {
    const value = localStorage.getItem(PENDING_TEMPLATE_KEY);
    localStorage.removeItem(PENDING_TEMPLATE_KEY);
    return value === 'umkm' || value === 'personal' ? value : undefined;
  } catch {
    return undefined;
  }
}

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
  return () => {
    listeners.delete(listener);
  };
}

/* ------------------------------------------------------------------ */
/* Helper                                                             */
/* ------------------------------------------------------------------ */

function currentMode(): AppMode {
  return snapshot.mode;
}

function storageKey(): string {
  const email = snapshot.email ?? getSessionEmail();
  return snapshot.mode === 'account' && email ? userKey(email) : GUEST_KEY;
}

function nowIso(): string {
  return new Date().toISOString();
}

function setSync(patch: Partial<SyncState>): void {
  setSnapshot({ sync: { ...snapshot.sync, ...patch } });
}

async function persistRecord(
  database: KasKilatDatabase,
  pendingSync: boolean,
  lastSyncedAt: string | null
): Promise<void> {
  await putLocalRecord({
    key: storageKey(),
    database,
    pendingSync,
    lastSyncedAt,
    updatedAt: Date.now(),
  });
}

/* ------------------------------------------------------------------ */
/* Sinkronisasi Drive                                                 */
/* ------------------------------------------------------------------ */

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let syncing = false;
let mustPullBeforePush = false;
let onlineListenerAttached = false;

function scheduleSync(delayMs = SYNC_DEBOUNCE_MS): void {
  if (currentMode() !== 'account' || !isDriveConnected()) return;
  if (syncTimer) clearTimeout(syncTimer);
  setSync({ phase: 'saving' });
  syncTimer = setTimeout(() => {
    syncTimer = null;
    void syncNow();
  }, delayMs);
}

async function reconcileWithDrive(): Promise<boolean> {
  const local = snapshot.database;
  const drive = await downloadDatabaseFromDrive();
  mustPullBeforePush = false;

  if (!drive) return false;
  if (!local) {
    setSnapshot({
      database: drive.database,
      status: 'ready',
      sync: { phase: 'synced', lastSyncedAt: nowIso() },
    });
    await persistRecord(drive.database, false, nowIso());
    return true;
  }

  if (drive.database.lastUpdated > local.lastUpdated) {
    const syncedAt = nowIso();
    await persistRecord(drive.database, false, syncedAt);
    setSnapshot({
      database: drive.database,
      status: 'ready',
      sync: { phase: 'synced', lastSyncedAt: syncedAt },
    });
    return true;
  }
  return false;
}

export async function syncNow(): Promise<void> {
  if (currentMode() !== 'account' || !snapshot.database) return;
  if (syncing) return;
  if (!isDriveConnected()) {
    setSync({ phase: 'local' });
    return;
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    setSync({ phase: 'offline' });
    return;
  }

  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }

  syncing = true;
  setSync({ phase: 'syncing' });

  try {
    if (mustPullBeforePush) {
      const pulled = await reconcileWithDrive();
      if (pulled) {
        syncing = false;
        return;
      }
    }

    const database = snapshot.database;
    if (!database) {
      syncing = false;
      return;
    }

    await uploadDatabaseToDrive(database);
    const syncedAt = nowIso();
    await persistRecord(database, false, syncedAt);
    setSync({ phase: 'synced', lastSyncedAt: syncedAt });
  } catch (error) {
    mustPullBeforePush = true;
    console.warn('[Sync] Gagal sync ke Drive:', error);
    setSync({ phase: 'offline' });
    showToast('Gagal sync ke Drive, data aman di HP ini', 'error');
  } finally {
    syncing = false;
  }
}

function attachOnlineListener(): void {
  if (onlineListenerAttached || typeof window === 'undefined') return;
  onlineListenerAttached = true;

  window.addEventListener('online', () => {
    if (currentMode() === 'account') void syncNow();
  });

  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && currentMode() === 'account') {
      if (snapshot.sync.phase === 'offline') void syncNow();
    }
  });
}

/* ------------------------------------------------------------------ */
/* Inisialisasi                                                       */
/* ------------------------------------------------------------------ */

let initPromise: Promise<void> | null = null;

export function initializeApp(): Promise<void> {
  if (!initPromise) initPromise = initOnce();
  return initPromise;
}

async function initOnce(): Promise<void> {
  attachOnlineListener();
  setSnapshot({ status: 'loading' });

  // Bila aplikasi baru kembali dari halaman Google, token barunya sudah menunggu.
  await resolveRedirectLogin();
  const intent = takeRedirectIntent();
  const pendingTemplate = takePendingTemplate();

  const redirectError = takeRedirectError();
  if (intent === 'login' && redirectError) {
    showToast('Login Google dibatalkan. Data tetap aman di HP ini.', 'error');
  }

  const email = getSessionEmail();
  if (hasGoogleSession() && email) {
    if (intent === 'login' && isAccessTokenValid()) {
      // Baru kembali dari layar izin Google: pola penyambungan akun tetap sama
      // seperti login popup, termasuk tawaran memindahkan data tamu.
      await activateAccount(email, pendingTemplate);
      return;
    }

    // Token habis: sambungkan ulang diam-diam tanpa perlu diketuk pengguna.
    if (!isAccessTokenValid() && startSilentGoogleRestore()) {
      // Halaman sedang berpindah ke Google. Kalau pengalihan ternyata diblokir,
      // aplikasi tetap terbuka dengan data lokal setelah beberapa detik.
      window.setTimeout(() => {
        void loadAccount(email);
      }, 8000);
      return;
    }
    await loadAccount(email);
    return;
  }
  await loadGuest();
}

async function loadGuest(): Promise<void> {
  try {
    const record = await getLocalRecord(GUEST_KEY);
    if (record) {
      setSnapshot({
        status: 'ready',
        mode: 'guest',
        email: null,
        database: record.database,
        sync: { phase: 'local', lastSyncedAt: null },
        pendingUpgrade: null,
      });
      return;
    }

    const legacy = readLegacyLocalData();
    if (legacy) {
      await putLocalRecord({
        key: GUEST_KEY,
        database: legacy,
        pendingSync: false,
        lastSyncedAt: null,
        updatedAt: Date.now(),
      });
      clearLegacyLocalData();
      setSnapshot({
        status: 'ready',
        mode: 'guest',
        email: null,
        database: legacy,
        sync: { phase: 'local', lastSyncedAt: null },
        pendingUpgrade: null,
      });
      return;
    }
  } catch (error) {
    console.warn('[DB] Gagal membaca data lokal:', error);
  }

  setSnapshot({
    status: 'onboarding',
    mode: 'guest',
    email: null,
    database: null,
    sync: { phase: 'local', lastSyncedAt: null },
    pendingUpgrade: null,
  });
}

async function loadAccount(email: string): Promise<void> {
  const key = userKey(email);
  const local = await getLocalRecord(key);

  setSnapshot({
    mode: 'account',
    email,
    database: local?.database ?? null,
    sync: { phase: 'syncing', lastSyncedAt: local?.lastSyncedAt ?? null },
  });

  // Token Google hanya bertahan ~1 jam. Kalau sudah habis, jangan membuka jendela
  // Google sendiri saat aplikasi dibuka; tampilkan data lokal dan minta satu ketukan
  // "Sambung" (tombol di header) untuk memulihkan backup Drive.
  if (!isAccessTokenValid()) {
    setSnapshot({
      status: local?.database ? 'ready' : 'onboarding',
      sync: { phase: 'offline', lastSyncedAt: local?.lastSyncedAt ?? null },
    });
    return;
  }

  if (local?.database && local.pendingSync) {
    setSnapshot({ status: 'ready' });
    scheduleSync(0);
    return;
  }

  try {
    const drive = await downloadDatabaseFromDrive();

    if (drive) {
      if (!local?.database || drive.database.lastUpdated >= local.database.lastUpdated) {
        const syncedAt = nowIso();
        await persistRecord(drive.database, false, syncedAt);
        setSnapshot({
          status: 'ready',
          database: drive.database,
          sync: { phase: 'synced', lastSyncedAt: syncedAt },
        });
      } else {
        setSnapshot({ status: 'ready' });
        scheduleSync(0);
      }
      return;
    }

    if (local?.database) {
      setSnapshot({ status: 'ready' });
      scheduleSync(0);
      return;
    }

    setSnapshot({
      status: 'onboarding',
      database: null,
      sync: { phase: 'local', lastSyncedAt: null },
    });
  } catch (error) {
    console.warn('[DB] Gagal memuat Drive:', error);
    mustPullBeforePush = true;
    if (local?.database) {
      setSnapshot({
        status: 'ready',
        database: local.database,
        sync: { phase: 'offline', lastSyncedAt: local.lastSyncedAt ?? null },
      });
    } else {
      setSnapshot({
        status: 'onboarding',
        database: null,
        sync: { phase: 'offline', lastSyncedAt: null },
      });
    }
  }
}

/* ------------------------------------------------------------------ */
/* Onboarding                                                         */
/* ------------------------------------------------------------------ */

export async function startAsGuest(template: TemplateType): Promise<void> {
  const database = createEmptyDatabase(template);

  await putLocalRecord({
    key: GUEST_KEY,
    database,
    pendingSync: false,
    lastSyncedAt: null,
    updatedAt: Date.now(),
  });
  clearLegacyLocalData();

  setSnapshot({
    status: 'ready',
    mode: 'guest',
    email: null,
    database,
    sync: { phase: 'local', lastSyncedAt: null },
    pendingUpgrade: null,
  });
}

async function ensureGoogleSession(): Promise<string> {
  if (isAccessTokenValid() && getSessionEmail()) return getSessionEmail() as string;
  if (hasGoogleSession()) {
    try {
      await ensureAccessToken();
      const email = getSessionEmail();
      if (email) return email;
    } catch {
      // fall through ke consent penuh
    }
  }
  const session = await connectGoogle({ prompt: '' });
  return session.email;
}

export async function startWithGoogle(template?: TemplateType): Promise<void> {
  if (isLongSessionEnabled()) {
    // Login lewat pengalihan halaman: izin Google tersimpan di konteks aplikasi
    // ini, sehingga pembukaan berikutnya bisa menyambung diam-diam.
    // Menyambung ulang akun lama tidak perlu memunculkan tawaran pindah data tamu.
    const reconnect = Boolean(getSessionEmail());
    savePendingTemplate(reconnect ? undefined : template);
    startGoogleRedirect(reconnect ? 'restore' : 'login', 'select_account');
    return;
  }

  const email = await ensureGoogleSession();
  await activateAccount(email, template);
}

async function activateAccount(email: string, template?: TemplateType): Promise<void> {
  const key = userKey(email);
  const local = await getLocalRecord(key);
  const guest = await getLocalRecord(GUEST_KEY);

  let drive: Awaited<ReturnType<typeof downloadDatabaseFromDrive>> = null;
  let driveFailed = false;

  try {
    drive = await downloadDatabaseFromDrive();
  } catch (error) {
    console.warn('[DB] Gagal membaca Drive saat login:', error);
    driveFailed = true;
  }

  let database: KasKilatDatabase | null = null;
  if (local?.database && local.pendingSync) {
    database = local.database;
  } else if (drive) {
    database =
      !local?.database || drive.database.lastUpdated >= local.database.lastUpdated
        ? drive.database
        : local.database;
  } else if (local?.database) {
    database = local.database;
  }

  const guestTxCount = guest?.database.transactions.length ?? 0;

  if (!database) {
    if (!drive && guest && guestTxCount === 0) {
      database = guest.database;
    } else {
      database = createEmptyDatabase(template ?? guest?.database.template ?? 'umkm');
    }
  }

  if (guestTxCount > 0) {
    const pendingUpgrade: GuestUpgradeRequest = {
      guestTransactionCount: guestTxCount,
      guestCategoryCount: guest!.database.categories.length,
      hasDriveData: Boolean(drive),
    };

    setSnapshot({
      status: 'ready',
      mode: 'account',
      email,
      database,
      sync: { phase: drive ? 'synced' : 'local', lastSyncedAt: null },
      pendingUpgrade,
    });
    return;
  }

  await persistRecord(database, true, null);
  setSnapshot({
    status: 'ready',
    mode: 'account',
    email,
    database,
    sync: { phase: 'saving', lastSyncedAt: null },
    pendingUpgrade: null,
  });

  if (guest) {
    await deleteLocalRecord(GUEST_KEY).catch(() => undefined);
  }

  if (driveFailed) {
    mustPullBeforePush = true;
    setSync({ phase: 'offline' });
  } else {
    scheduleSync();
  }
}

/* ------------------------------------------------------------------ */
/* Upgrade tamu → akun                                                */
/* ------------------------------------------------------------------ */

async function migratePhotosInDatabase(
  database: KasKilatDatabase
): Promise<{ database: KasKilatDatabase; moved: number; failed: number }> {
  let moved = 0;
  let failed = 0;
  const transactions: Transaction[] = [];

  for (const tx of database.transactions) {
    if (tx.photo_url?.startsWith('local://')) {
      try {
        const ref = await migratePhotoToDrive(tx.photo_url);
        if (ref) {
          moved += 1;
          transactions.push({ ...tx, photo_url: ref });
          continue;
        }
      } catch {
        failed += 1;
      }
    }
    transactions.push(tx);
  }

  return {
    database: { ...database, transactions: sortTransactions(transactions) },
    moved,
    failed,
  };
}

export async function completeGuestUpgrade(choice: 'move' | 'fresh'): Promise<void> {
  const pending = snapshot.pendingUpgrade;
  if (!pending || currentMode() !== 'account') return;

  const guest = await getLocalRecord(GUEST_KEY);

  if (choice === 'move' && guest) {
    const base = snapshot.database ?? createEmptyDatabase(guest.database.template ?? 'umkm');
    const merged = mergeDatabases(base, guest.database);
    const migrated = await migratePhotosInDatabase(merged);

    await deleteLocalRecord(GUEST_KEY).catch(() => undefined);
    clearLegacyLocalData();

    setSnapshot({
      database: migrated.database,
      pendingUpgrade: null,
      status: 'ready',
    });
    await persistRecord(migrated.database, true, null);
    setSync({ phase: 'saving' });
    scheduleSync();

    if (migrated.failed > 0) {
      showToast(
        `${migrated.moved} foto dipindah ke Drive, ${migrated.failed} foto tetap di HP ini`,
        'info'
      );
    }
    return;
  }

  // Mulai Baru: data tamu tetap disimpan sebagai cadangan di IndexedDB.
  const base =
    snapshot.database ??
    createEmptyDatabase(guest?.database.template ?? 'umkm');

  setSnapshot({ database: base, pendingUpgrade: null, status: 'ready' });
  await persistRecord(base, true, null);
  setSync({ phase: 'saving' });
  scheduleSync();
}

/* ------------------------------------------------------------------ */
/* Logout                                                             */
/* ------------------------------------------------------------------ */

export async function logout(): Promise<void> {
  const template = snapshot.database?.template ?? 'umkm';

  clearDriveCache();
  disconnectGoogle();

  let guest = await getLocalRecord(GUEST_KEY).catch(() => null);
  if (!guest) {
    const database = createEmptyDatabase(template);
    guest = {
      key: GUEST_KEY,
      database,
      pendingSync: false,
      lastSyncedAt: null,
      updatedAt: Date.now(),
    };
    await putLocalRecord(guest).catch(() => undefined);
  }

  setSnapshot({
    status: 'ready',
    mode: 'guest',
    email: null,
    database: guest.database,
    sync: { phase: 'local', lastSyncedAt: null },
    pendingUpgrade: null,
  });

  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }

  showToast('Logged out - Kembali ke Mode Tamu', 'info');
}

/* ------------------------------------------------------------------ */
/* CRUD                                                               */
/* ------------------------------------------------------------------ */

async function commitDatabase(next: KasKilatDatabase): Promise<void> {
  const mode = currentMode();
  const pending = mode === 'account';

  setSnapshot({
    database: next,
    status: 'ready',
    ...(pending ? { sync: { ...snapshot.sync, phase: 'saving' } } : {}),
  });

  await persistRecord(next, pending, snapshot.sync.lastSyncedAt);

  if (pending) scheduleSync();
}

function requireDatabase(): KasKilatDatabase {
  if (!snapshot.database) {
    throw new Error('Database belum siap.');
  }
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
    lastUpdated: nowIso(),
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
    lastUpdated: nowIso(),
  });

  return updated;
}

export async function deleteTransaction(id: string): Promise<void> {
  const database = requireDatabase();
  await commitDatabase({
    ...database,
    transactions: database.transactions.filter((tx) => tx.id !== id),
    lastUpdated: nowIso(),
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

  await commitDatabase({
    ...database,
    categories: [...database.categories, category],
    lastUpdated: nowIso(),
  });

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
    lastUpdated: nowIso(),
  });
}

/* ------------------------------------------------------------------ */
/* Foto lokal → Drive                                                 */
/* ------------------------------------------------------------------ */

export function countLocalPhotos(): number {
  return (
    snapshot.database?.transactions.filter((tx) => tx.photo_url?.startsWith('local://'))
      .length ?? 0
  );
}

export async function uploadLocalPhotosToDrive(): Promise<{ moved: number; failed: number }> {
  const database = requireDatabase();
  if (currentMode() !== 'account' || !isDriveConnected()) {
    return { moved: 0, failed: 0 };
  }

  const migrated = await migratePhotosInDatabase(database);
  if (migrated.moved > 0) {
    await commitDatabase({ ...migrated.database, lastUpdated: nowIso() });
  }

  return { moved: migrated.moved, failed: migrated.failed };
}

/* ------------------------------------------------------------------ */
/* Peringatan mode tamu                                               */
/* ------------------------------------------------------------------ */

export function shouldShowGuestWarning(): boolean {
  if (currentMode() !== 'guest') return false;
  try {
    return localStorage.getItem(APP_CONFIG.STORAGE_KEYS.GUEST_WARNING_SHOWN) !== '1';
  } catch {
    return false;
  }
}

export function markGuestWarningShown(): void {
  try {
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.GUEST_WARNING_SHOWN, '1');
  } catch {
    // localStorage bisa diblokir
  }
}

/* ------------------------------------------------------------------ */
/* Query helper                                                       */
/* ------------------------------------------------------------------ */

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
