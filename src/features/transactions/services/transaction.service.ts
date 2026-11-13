/**
 * @file transaction.service.ts
 * @description Layanan CRUD data transaksi kas UMKM (terkoneksi ke Supabase dengan sinkronisasi penyimpanan lokal).
 */

import { Transaction, CreateTransactionInput, TransactionFilter } from '../types/transaction.type';
import { getSupabase } from '../../../lib/supabase-client';
import { APP_CONFIG } from '../../../lib/constants';

const STORAGE_KEY = APP_CONFIG.STORAGE_KEYS.TRANSACTIONS;

/**
 * 3 Data dummy awal untuk pengujian langsung
 */
const INITIAL_DUMMY_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-dummy-1',
    type: 'out',
    amount: 147500,
    transaction_date: '2026-11-10',
    merchant: 'INDOMARET POINT',
    description: 'Belanja persediaan minyak goreng 2L, gula pasir, dan telur',
    category_id: 'cat-out-1',
    payment_method: 'Tunai',
    ocr_raw_text: 'INDOMARET POINT\nJL. PEMUDA NO. 45\nTOTAL BELANJA: Rp 147.500\nTUNAI: 150.000\nKEMBALIAN: 2.500',
    ocr_confidence: 94,
    created_at: new Date('2026-11-10T14:22:00').toISOString(),
  },
  {
    id: 'tx-dummy-2',
    type: 'in',
    amount: 1250000,
    transaction_date: '2026-11-11',
    merchant: 'ANDI SUSANTO',
    description: 'Pelunasan pesanan katering nasi box 50 porsi untuk acara kantor',
    category_id: 'cat-in-1',
    payment_method: 'Transfer BCA',
    ocr_raw_text: 'm-BCA TRANSFER BERHASIL\nPENGIRIM: ANDI SUSANTO\nNOMINAL TRANSFER: Rp 1.250.000\nBERITA: PESANAN KATERING 50 BOX',
    ocr_confidence: 98,
    created_at: new Date('2026-11-11T09:15:00').toISOString(),
  },
  {
    id: 'tx-dummy-3',
    type: 'out',
    amount: 825000,
    transaction_date: '2026-11-09',
    merchant: 'TOKO SUMBER REJEKI SEMBAKO',
    description: 'Beli beras pandan wangi 25kg, bawang merah 5kg, cabai rawit 4kg',
    category_id: 'cat-out-1',
    payment_method: 'Tunai',
    ocr_raw_text: 'TOKO SUMBER REJEKI SEMBAKO\nNOTA KONTAN\nGRAND TOTAL RP: 825.000\nSTATUS: LUNAS',
    ocr_confidence: 89,
    created_at: new Date('2026-11-09T10:30:00').toISOString(),
  },
];

/**
 * Mengambil transaksi dengan opsi filter
 */
export async function getTransactions(filter?: TransactionFilter): Promise<Transaction[]> {
  const supabase = getSupabase();

  let list: Transaction[] = [];
  let loadedFromCloud = false;

  if (supabase) {
    try {
      let query = supabase.from('transactions').select('*').order('transaction_date', { ascending: false });

      if (filter?.type && filter.type !== 'all') {
        query = query.eq('type', filter.type);
      }
      if (filter?.categoryId) {
        query = query.eq('category_id', filter.categoryId);
      }
      if (filter?.startDate) {
        query = query.gte('transaction_date', filter.startDate);
      }
      if (filter?.endDate) {
        query = query.lte('transaction_date', filter.endDate);
      }

      const { data, error } = await query;
      // Hasil kosong dari Supabase tetap valid (jangan dianggap gagal lalu jatuh ke data lokal)
      if (!error && data) {
        list = data as Transaction[];
        loadedFromCloud = true;
      }
    } catch (err) {
      console.warn('[TransactionService] Gagal memuat dari Supabase:', err);
    }
  }

  // Mode lokal: baca localStorage. Data dummy hanya diisi saat pertama kali (key belum ada),
  // sehingga transaksi yang sengaja dihapus semua tidak muncul kembali.
  if (!loadedFromCloud) {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      try {
        list = JSON.parse(saved) as Transaction[];
      } catch {
        list = [];
      }
    } else if (!supabase) {
      list = INITIAL_DUMMY_TRANSACTIONS;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
  }

  // Filter di client jika dalam mode lokal
  let filtered = [...list];
  if (filter?.type && filter.type !== 'all') {
    filtered = filtered.filter((t) => t.type === filter.type);
  }
  if (filter?.categoryId) {
    filtered = filtered.filter((t) => t.category_id === filter.categoryId);
  }
  if (filter?.startDate) {
    filtered = filtered.filter((t) => t.transaction_date >= filter.startDate!);
  }
  if (filter?.endDate) {
    filtered = filtered.filter((t) => t.transaction_date <= filter.endDate!);
  }
  if (filter?.searchQuery) {
    const q = filter.searchQuery.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        (t.merchant && t.merchant.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        t.amount.toString().includes(q)
    );
  }

  // Urutkan dari tanggal terbaru
  return filtered.sort((a, b) => (b.transaction_date > a.transaction_date ? 1 : -1));
}

/**
 * Menyimpan transaksi baru
 */
export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  const supabase = getSupabase();
  const newTx: Transaction = {
    id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    ...input,
    created_at: new Date().toISOString(),
  };

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([input])
        .select()
        .single();
      if (!error && data) return data as Transaction;
    } catch (err) {
      console.warn('[TransactionService] Gagal simpan ke Supabase:', err);
    }
  }

  // Simpan ke storage lokal
  const current = await getTransactions();
  const updated = [newTx, ...current];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return newTx;
}

/**
 * Memperbarui transaksi
 */
export async function updateTransaction(
  id: string,
  input: Partial<CreateTransactionInput>
): Promise<Transaction | null> {
  const current = await getTransactions();
  const index = current.findIndex((t) => t.id === id);
  if (index === -1) return null;

  const updatedTx: Transaction = {
    ...current[index],
    ...input,
  };

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('transactions').update(input).eq('id', id);
    } catch (err) {
      console.warn('[TransactionService] Gagal update di Supabase:', err);
    }
  }

  current[index] = updatedTx;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  return updatedTx;
}

/**
 * Menghapus transaksi
 */
export async function deleteTransaction(id: string): Promise<boolean> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('transactions').delete().eq('id', id);
    } catch (err) {
      console.warn('[TransactionService] Gagal hapus di Supabase:', err);
    }
  }

  const current = await getTransactions();
  const filtered = current.filter((t) => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}
