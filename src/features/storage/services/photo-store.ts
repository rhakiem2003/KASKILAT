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
      request.onerror = () => reject(request.error || new Error('Gagal membuka IndexedDB.'));
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
    const tx = db.transaction(STORE_NAME, mode);
    const request = operation(tx.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Operasi foto gagal.'));
  });
}

export interface PhotoRecord {
  id: string;
  blob: Blob;
  createdAt: number;
}

export async function putPhotoBlob(id: string, blob: Blob): Promise<void> {
  const record: PhotoRecord = { id, blob, createdAt: Date.now() };
  await withStore('readwrite', (store) => store.put(record));
}

export async function getPhotoBlob(id: string): Promise<Blob | null> {
  const record = await withStore<PhotoRecord | undefined>('readonly', (store) => store.get(id));
  return record?.blob ?? null;
}

export async function getAllPhotoBlobs(): Promise<PhotoRecord[]> {
  return withStore<PhotoRecord[]>('readonly', (store) => store.getAll());
}

export async function deletePhotoBlob(id: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(id));
}
