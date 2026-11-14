/**
 * @file share-target.ts
 * @description Mengambil gambar yang dikirim dari menu "Bagikan" HP lewat service worker.
 */

const SHARE_CACHE = 'kaskilat-share-v1';
const FILE_PREFIX = '/__shared/';
const PENDING_KEY = 'kaskilat_share_pending';

/**
 * Penanda kiriman dipindah ke sessionStorage agar tetap bertahan bila aplikasi
 * sempat berpindah halaman (mis. login Google) sebelum siap memproses gambar.
 */
export function markShareArrival(): void {
  const url = new URL(window.location.href);
  if (url.searchParams.get('shared') !== '1') return;

  url.searchParams.delete('shared');
  window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  try {
    sessionStorage.setItem(PENDING_KEY, '1');
  } catch {
    // abaikan
  }
}

export function hasPendingShare(): boolean {
  try {
    return sessionStorage.getItem(PENDING_KEY) === '1';
  } catch {
    return false;
  }
}

export function clearPendingShare(): void {
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // abaikan
  }
}

export async function takeSharedImages(): Promise<File[]> {
  if (!('caches' in window)) return [];

  const cache = await caches.open(SHARE_CACHE);
  const keys = (await cache.keys())
    .filter((request) => new URL(request.url).pathname.startsWith(FILE_PREFIX))
    .sort((a, b) => a.url.localeCompare(b.url, undefined, { numeric: true }));

  const files: File[] = [];
  for (const key of keys) {
    const response = await cache.match(key);
    if (!response) continue;
    const blob = await response.blob();
    const name =
      decodeURIComponent(response.headers.get('X-File-Name') || '') ||
      `struk-${files.length + 1}.jpg`;
    files.push(new File([blob], name, { type: blob.type || 'image/jpeg' }));
  }

  await Promise.all(keys.map((key) => cache.delete(key)));
  return files;
}