/**
 * @file App.tsx
 * @description Root Application KasKilat UMKM - Pembukuan Kas In / Kas Out dengan OCR Otomatis.
 */

import React, { useState } from 'react';
import { AppHeader } from './components/layout/AppHeader';
import { BottomNavigation } from './components/layout/BottomNavigation';
import { BalanceSummaryCard } from './features/dashboard/components/BalanceSummaryCard';
import { CashflowChart30Days } from './features/dashboard/components/CashflowChart30Days';
import { RecentTransactionsList } from './features/dashboard/components/RecentTransactionsList';
import { TransactionListView } from './features/transactions/components/TransactionListView';
import { ReportView } from './features/reports/components/ReportView';
import { ScanReceiptModal } from './features/ocr/components/ScanReceiptModal';
import { ManualTransactionModal } from './features/transactions/components/ManualTransactionModal';
import { TransactionDetailModal } from './features/transactions/components/TransactionDetailModal';
import { CategoryListModal } from './features/categories/components/CategoryListModal';
import { BackendSettingsModal } from './features/auth/components/BackendSettingsModal';
import { PhotoLightboxModal } from './features/transactions/components/PhotoLightboxModal';
import { useTransactions } from './features/transactions/hooks/useTransactions';
import { useCategories } from './features/categories/hooks/useCategories';
import { useCreateTransaction } from './features/transactions/hooks/useCreateTransaction';
import { Transaction, CreateTransactionInput } from './features/transactions/types/transaction.type';
import { deleteReceiptPhoto } from './features/storage/services/photo.service';
import { APP_CONFIG } from './lib/constants';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'reports'>('dashboard');

  // Modals state
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isBackendModalOpen, setIsBackendModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [lightboxPhotoUrl, setLightboxPhotoUrl] = useState<string | null>(null);

  // Business hooks
  const {
    transactions,
    summary,
    refreshTransactions,
    deleteTransaction,
  } = useTransactions();

  const {
    categories,
    addCategory,
    removeCategory,
    refreshCategories,
  } = useCategories();

  const { saveTransaction } = useCreateTransaction();

  // Handlers
  const handleSaveFromScan = async (input: CreateTransactionInput) => {
    await saveTransaction(input);
    await refreshTransactions();
  };

  const handleSaveFromManual = async (input: CreateTransactionInput) => {
    await saveTransaction(input);
    await refreshTransactions();
    setIsManualModalOpen(false);
  };

  const handleDeleteTransaction = async (id: string) => {
    const photoRef = selectedTransaction?.id === id ? selectedTransaction.photo_url : undefined;
    await deleteTransaction(id);
    if (photoRef) {
      await deleteReceiptPhoto(photoRef);
    }
    setSelectedTransaction(null);
  };

  const handleResetData = () => {
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.CATEGORIES);
    refreshTransactions();
    refreshCategories();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Header Aplikasi (Desktop & Mobile) */}
      <AppHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onScanClick={() => setIsScanModalOpen(true)}
        onOpenCategories={() => setIsCategoryModalOpen(true)}
        onOpenBackendSettings={() => setIsBackendModalOpen(true)}
      />

      {/* Konten Utama Responsif */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 pb-24 md:pb-12">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Kartu Ringkasan Saldo & Arus Kas */}
            <BalanceSummaryCard
              summary={summary}
              onScanClick={() => setIsScanModalOpen(true)}
            />

            {/* Grafik Arus Kas 30 Hari Terakhir */}
            <CashflowChart30Days transactions={transactions} />

            {/* 5 Transaksi Terakhir */}
            <RecentTransactionsList
              transactions={transactions}
              categories={categories}
              onViewAll={() => setActiveTab('transactions')}
              onSelectTransaction={setSelectedTransaction}
              onScanClick={() => setIsScanModalOpen(true)}
              onPhotoClick={setLightboxPhotoUrl}
            />
          </div>
        )}

        {activeTab === 'transactions' && (
          <TransactionListView
            transactions={transactions}
            categories={categories}
            onSelectTransaction={setSelectedTransaction}
            onScanClick={() => setIsScanModalOpen(true)}
            onPhotoClick={setLightboxPhotoUrl}
          />
        )}

        {activeTab === 'reports' && (
          <ReportView
            transactions={transactions}
            categories={categories}
          />
        )}
      </main>

      {/* Navigasi Bawah Mobile (Thumb-zone) */}
      <BottomNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onScanClick={() => setIsScanModalOpen(true)}
        onOpenCategories={() => setIsCategoryModalOpen(true)}
      />

      {/* Modal Alur OCR Foto Struk */}
      <ScanReceiptModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        categories={categories}
        onTransactionSaved={handleSaveFromScan}
        onOpenSettings={() => {
          setIsScanModalOpen(false);
          setIsBackendModalOpen(true);
        }}
      />

      {/* Modal Input Transaksi Manual */}
      <ManualTransactionModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        categories={categories}
        onSave={handleSaveFromManual}
      />

      {/* Modal Detail Transaksi & Hapus */}
      <TransactionDetailModal
        isOpen={Boolean(selectedTransaction)}
        onClose={() => setSelectedTransaction(null)}
        transaction={selectedTransaction}
        category={categories.find((c) => c.id === selectedTransaction?.category_id)}
        onDelete={handleDeleteTransaction}
      />

      {/* Modal Kelola Kategori */}
      <CategoryListModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        onAddCategory={addCategory}
        onDeleteCategory={removeCategory}
      />

      {/* Modal Status Backend & Database */}
      <BackendSettingsModal
        isOpen={isBackendModalOpen}
        onClose={() => setIsBackendModalOpen(false)}
        onResetData={handleResetData}
      />

      {/* Modal Pembesar Foto Struk Fullscreen */}
      <PhotoLightboxModal
        photoUrl={lightboxPhotoUrl}
        onClose={() => setLightboxPhotoUrl(null)}
      />
    </div>
  );
}
