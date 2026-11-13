/**
 * @file image-source.ts
 * @description Deteksi jenis gambar (screenshot vs foto kamera) serta pengecilan & kompresi sebelum OCR/upload.
 */

export type ImageKind = 'screenshot' | 'photo';

export interface PreparedImage {
  dataUrl: string;
  blob: Blob;
  mimeType: string;
  fileName: string;
  kind: ImageKind;
}

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

/**
 * Screenshot/digital capture diproses Tesseract; foto kamera diproses Gemini.
 * Contoh struk bawaan dibuat di kanvas sehingga selalu dianggap screenshot.
 */
export function detectImageKind(source: string | File, fileName?: string): ImageKind {
  if (typeof source === 'string' && source.startsWith('data:')) {
    return 'screenshot';
  }

  const name = (typeof source === 'string' ? fileName : source.name)?.toLowerCase() || '';
  if (/(screen[\s_-]?shot|screenshot|tangkapan|screencap|capture)/.test(name)) {
    return 'screenshot';
  }

  if (typeof source !== 'string') {
    const type = source.type.toLowerCase();
    if (type === 'image/png' || type === 'image/webp' || type === 'image/gif') {
      return 'screenshot';
    }
  }

  return 'photo';
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Gagal memuat gambar struk.'));
    img.src = src;
  });
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.readAsDataURL(file);
  });
}

function scaleDimensions(width: number, height: number, maxDimension: number) {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }
  if (width >= height) {
    return { width: maxDimension, height: Math.round((height * maxDimension) / width) };
  }
  return { width: Math.round((width * maxDimension) / height), height: maxDimension };
}

function toJpegFileName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '') || 'struk';
  return `${base}.jpg`;
}

/**
 * Mengubah File/Data URL menjadi JPEG terkompresi (maks 1600px) untuk OCR dan penyimpanan.
 */
export async function prepareImage(
  source: string | File,
  options?: { maxDimension?: number; quality?: number }
): Promise<PreparedImage> {
  const maxDimension = options?.maxDimension ?? MAX_DIMENSION;
  const quality = options?.quality ?? JPEG_QUALITY;
  const kind = detectImageKind(source);
  const rawDataUrl = typeof source === 'string' ? source : await readFileAsDataUrl(source);
  const originalName =
    typeof source === 'string' ? `struk-${Date.now()}.jpg` : source.name || 'struk.jpg';

  const img = await loadImage(rawDataUrl);
  const { width, height } = scaleDimensions(img.naturalWidth, img.naturalHeight, maxDimension);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    const blob = typeof source === 'string' ? await (await fetch(rawDataUrl)).blob() : source;
    return {
      dataUrl: rawDataUrl,
      blob,
      mimeType: blob.type || 'image/jpeg',
      fileName: originalName,
      kind,
    };
  }

  // Latar putih agar PNG transparan tidak menjadi hitam saat dikonversi ke JPEG
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('Gagal mengompres gambar.'))),
      'image/jpeg',
      quality
    );
  });

  return {
    dataUrl,
    blob,
    mimeType: 'image/jpeg',
    fileName: toJpegFileName(originalName),
    kind,
  };
}
