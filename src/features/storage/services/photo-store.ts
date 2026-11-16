/**
 * @file photo-store.ts
 * @description Receipt image blobs stored in IndexedDB on this device.
 */

const DB_NAME = 'kaskilat_photos';
const DB_VERSION = 1;
const STORE_NAME = 'photos';

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
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        dbPromise = null;
        reject(request.error || new Error('Gagal membuka IndexedDB foto.'));
      };
      request.onblocked = () => {
        dbPromise = null;
        reject(new Error('Penyimpanan foto sedang dipakai tab lain.'));
      };
    });
  }
  return dbPromise;
}

async function withStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    let request: IDBRequest<T>;
    let result: T;
    let settled = false;
    const tx = db.transaction(STORE_NAME, mode);

    const fail = (error: DOMException | Error | null | undefined) => {
      if (settled) return;
      settled = true;
      reject(error || new Error('Operasi foto gagal.'));
    };

    try {
      request = operation(tx.objectStore(STORE_NAME));
    } catch (error) {
      try { tx.abort(); } catch { /* transaction may already be inactive */ }
      fail(error instanceof Error ? error : new Error('Operasi foto gagal.'));
      return;
    }

    request.onsuccess = () => { result = request.result; };
    request.onerror = () => fail(request.error);
    tx.oncomplete = () => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    tx.onerror = () => fail(tx.error || request.error);
    tx.onabort = () => fail(tx.error || request.error || new Error('Transaksi foto dibatalkan.'));
  });
}

export interface PhotoRecord {
  id: string;
  blob: Blob;
  createdAt: number;
}

export async function putPhotoBlob(id: string, blob: Blob): Promise<void> {
  const record: PhotoRecord = { id, blob, createdAt: Date.now() };
  await withStore<IDBValidKey>('readwrite', (store) => store.put(record));
}

export async function getPhotoBlob(id: string): Promise<Blob | null> {
  const record = await withStore<PhotoRecord | undefined>('readonly', (store) => store.get(id));
  return record?.blob ?? null;
}

export async function getAllPhotoBlobs(): Promise<PhotoRecord[]> {
  return withStore<PhotoRecord[]>('readonly', (store) => store.getAll());
}

export async function deletePhotoBlob(id: string): Promise<void> {
  await withStore<undefined>('readwrite', (store) => store.delete(id));
}
