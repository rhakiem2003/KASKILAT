/**
 * @file useInstallPrompt.ts
 * @description Hook tombol "Install App" untuk PWA (beforeinstallprompt) + panduan manual per platform.
 */

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type InstallPlatform = 'ios' | 'android' | 'other';

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<(available: boolean) => void>();

function notify(): void {
  for (const listener of listeners) listener(Boolean(deferredPrompt));
}

function detectPlatform(): InstallPlatform {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;
  const iPadAsMac = /macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
  if (/iphone|ipad|ipod/i.test(ua) || iPadAsMac) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'other';
}

function detectStandalone(): boolean {
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
  const [standalone, setStandalone] = useState(detectStandalone);
  const [platform] = useState<InstallPlatform>(detectPlatform);

  useEffect(() => {
    listeners.add(setCanInstall);
    setCanInstall(Boolean(deferredPrompt));

    const media = window.matchMedia('(display-mode: standalone)');
    const syncStandalone = () => setStandalone(detectStandalone());
    media.addEventListener('change', syncStandalone);
    window.addEventListener('appinstalled', syncStandalone);

    return () => {
      listeners.delete(setCanInstall);
      media.removeEventListener('change', syncStandalone);
      window.removeEventListener('appinstalled', syncStandalone);
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

  return { canInstall, standalone, platform, install };
}
