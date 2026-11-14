/**
 * Penerima menu "Bagikan" Android (Web Share Target).
 * Gambar kiriman dititipkan di cache sementara, lalu aplikasi dibuka untuk membacanya.
 */

const SHARE_CACHE = 'kaskilat-share-v1';
const SHARE_PATH = '/share-target';
const FILE_PREFIX = '/__shared/';

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'POST') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname !== SHARE_PATH) return;

  event.respondWith(receiveShare(request));
});

async function receiveShare(request) {
  try {
    const form = await request.formData();
    const files = form.getAll('receipt').filter((entry) => typeof entry !== 'string' && entry.size > 0);

    const cache = await caches.open(SHARE_CACHE);
    for (const key of await cache.keys()) {
      await cache.delete(key);
    }

    let index = 0;
    for (const file of files) {
      await cache.put(
        FILE_PREFIX + index,
        new Response(file, {
          headers: {
            'Content-Type': file.type || 'image/jpeg',
            'X-File-Name': encodeURIComponent(file.name || `struk-${index + 1}.jpg`),
          },
        })
      );
      index += 1;
    }
  } catch (error) {
    // Kiriman gagal dibaca: tetap buka aplikasi supaya pengguna tidak terjebak layar kosong.
  }

  return Response.redirect(new URL('/?shared=1', self.location.origin).href, 303);
}