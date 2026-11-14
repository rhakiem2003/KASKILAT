/**
 * @file database.type.ts
 * @description Bentuk database KasKilat yang disimpan di IndexedDB dan Google Drive.
 */

import { Transaction } from '../../transactions/types/transaction.type';
import { Category } from '../../categories/types/category.type';
import type { TemplateType } from '../../../lib/templates';

export interface KasKilatDatabase {
  version: 1;
  transactions: Transaction[];
  categories: Category[];
  lastUpdated: string;
  template?: TemplateType;
}

export type AppMode = 'guest' | 'account';

export type SyncPhase = 'local' | 'saving' | 'syncing' | 'synced' | 'offline';

export interface SyncState {
  phase: SyncPhase;
  lastSyncedAt: string | null;
}

export interface GuestUpgradeRequest {
  guestTransactionCount: number;
  guestCategoryCount: number;
  hasDriveData: boolean;
}

export interface AppSnapshot {
  status: 'loading' | 'onboarding' | 'ready';
  mode: AppMode;
  email: string | null;
  database: KasKilatDatabase | null;
  sync: SyncState;
  pendingUpgrade: GuestUpgradeRequest | null;
}
