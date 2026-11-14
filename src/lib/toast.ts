/**
 * @file toast.ts
 * @description Notifikasi ringan non-blocking untuk status simpan/sync/OCR.
 */

export type ToastTone = 'info' | 'success' | 'error';

export interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

let nextId = 1;
let items: ToastItem[] = [];
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribeToasts(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getToasts(): ToastItem[] {
  return items;
}

export function dismissToast(id: number): void {
  items = items.filter((item) => item.id !== id);
  emit();
}

export function showToast(message: string, tone: ToastTone = 'info', durationMs = 4500): void {
  const id = nextId++;
  items = [...items.slice(-2), { id, tone, message }];
  emit();
  window.setTimeout(() => dismissToast(id), durationMs);
}
