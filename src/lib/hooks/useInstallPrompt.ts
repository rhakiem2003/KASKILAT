/**
 * @file useInstallPrompt.ts
 * @description Hook tombol "Install App" untuk PWA (beforeinstallprompt) + deteksi iOS.
 */

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<(available: boolean) => void>();

function notify(): void {
  for (const listener of listeners) listener(Boolean(deferredPrompt));
}

function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });
}

export function useInstallPrompt() {
  const [canInstall, setCanInstall] = useState(Boolean(deferredPrompt));

  useEffect(() => {
    listeners.add(setCanInstall);
    setCanInstall(Boolean(deferredPrompt));
    return () => {
      listeners.delete(setCanInstall);
    };
  }, []);

  const install = async (): Promise<'accepted' | 'dismissed' | null> => {
    if (!deferredPrompt) return null;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    notify();
    return choice.outcome;
  };

  // iOS Safari tidak pernah memicu beforeinstallprompt: pandu lewat menu Bagikan.
  const needsManualInstall = isIosDevice() && !isStandalone();

  return { canInstall, needsManualInstall, install };
}
