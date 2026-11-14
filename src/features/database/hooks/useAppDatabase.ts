/**
 * @file useAppDatabase.ts
 * @description Hook React untuk membaca snapshot database global.
 */

import { useSyncExternalStore } from 'react';
import type { AppSnapshot } from '../types/database.type';
import { getSnapshot, subscribe } from '../services/database-store';

export function useAppDatabase(): AppSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
