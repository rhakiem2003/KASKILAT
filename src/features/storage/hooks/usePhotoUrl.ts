/**
 * @file usePhotoUrl.ts
 * @description Hook untuk me-resolve referensi foto struk (Drive / IndexedDB / data URL) menjadi URL gambar.
 */

import { useEffect, useState } from 'react';
import { resolvePhotoUrl } from '../services/photo.service';

export interface PhotoUrlState {
  url: string | null;
  isLoading: boolean;
  error: string | null;
}

function isImmediatelyUsable(ref?: string | null): boolean {
  if (!ref) return false;
  return (
    ref.startsWith('data:') ||
    ref.startsWith('blob:') ||
    ref.startsWith('http://') ||
    ref.startsWith('https://')
  );
}

export function usePhotoUrl(ref?: string | null): PhotoUrlState {
  const [state, setState] = useState<PhotoUrlState>(() => ({
    url: isImmediatelyUsable(ref) ? (ref as string) : null,
    isLoading: Boolean(ref) && !isImmediatelyUsable(ref),
    error: null,
  }));

  useEffect(() => {
    let cancelled = false;

    if (!ref) {
      setState({ url: null, isLoading: false, error: null });
      return;
    }

    if (isImmediatelyUsable(ref)) {
      setState({ url: ref, isLoading: false, error: null });
      return;
    }

    setState({ url: null, isLoading: true, error: null });

    resolvePhotoUrl(ref)
      .then((url) => {
        if (!cancelled) setState({ url, isLoading: false, error: null });
      })
      .catch((error) => {
        if (!cancelled) {
          setState({
            url: null,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Gagal memuat foto struk.',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [ref]);

  return state;
}
