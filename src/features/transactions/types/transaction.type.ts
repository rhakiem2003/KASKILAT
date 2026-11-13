/**
 * @file transaction.type.ts
 * @description Tipe data TypeScript untuk entitas Transaksi Kas UMKM
 */

import { PaymentMethod } from '../../../lib/constants';

export type TransactionType = 'in' | 'out';

export interface Transaction {
  id: string;
  user_id?: string | null;
  type: TransactionType;
  amount: number;
  transaction_date: string; // YYYY-MM-DD
  description?: string;
  merchant?: string;
  category_id?: string;
  payment_method: PaymentMethod | string;
  photo_url?: string;
  ocr_raw_text?: string;
  ocr_confidence?: number; // 0 - 100
  created_at?: string;
}

export interface CreateTransactionInput {
  type: TransactionType;
  amount: number;
  transaction_date: string;
  description?: string;
  merchant?: string;
  category_id?: string;
  payment_method: PaymentMethod | string;
  photo_url?: string;
  ocr_raw_text?: string;
  ocr_confidence?: number;
}

export interface UpdateTransactionInput extends Partial<CreateTransactionInput> {
  id: string;
}

export interface TransactionFilter {
  type?: 'all' | TransactionType;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  searchQuery?: string;
}

export interface TransactionSummary {
  totalBalance: number;
  totalIncomeMonth: number;
  totalExpenseMonth: number;
  transactionCountMonth: number;
}
