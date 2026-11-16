/**
 * @file App.tsx
 * @description Local-first KasKilat: transactions, reports, receipt scanning and settings.
 */

import React, { useEffect, useState } from 'react';
import { AppHeader } from './components/layout/AppHeader';
import { KasKilatMark } from './components/brand/KasKilatLogo';
import { BottomNavigation } from './components/layout/BottomNavigation';
import { ToastHost } from './components/ui/ToastHost';
import { BalanceSummaryCard } from './features/dashboard/components/BalanceSummaryCard';
import { CashflowChart30Days } from './features/dashboard/components/CashflowChart30Days';
import { RecentTransactionsList } from './features/dashboard/components/RecentTransactionsList';
import { TransactionListView } from './features/transactions/components/TransactionListView';
import { ReportView } from './features/reports/components/ReportView';
import { ScanReceiptModal } from './features/ocr/components/ScanReceiptModal';
import { ManualTransactionModal } from './features/transactions/components/ManualTransactionModal';
import { AddTransactionModal } from './features/transactions/components/AddTransactionModal';
import { TransactionDetailModal } from './features/transactions/components/TransactionDetailModal';
import { CategoryListModal } from './features/categories/components/CategoryListModal';
import { SettingsModal } from './features/auth/components/SettingsModal';
import { OnboardingScreen } from './features/auth/components/OnboardingScreen';
import { PhotoLightboxModal } from './features/transactions/components/PhotoLightboxModal';
import { useTransactions } from './features/transactions/hooks/useTransactions';
import { useCategories } from './features/categories/hooks/useCategories';
import { useCreateTransaction } from './features/transactions/hooks/useCreateTransaction';
import { useAppDatabase } from './features/database/hooks/useAppDatabase';
import { initializeApp } from './features/database/services/database-store';
import type { Transaction, CreateTransactionInput } from './features/transactions/types/transaction.type';
import { deleteReceiptPhoto } from './features/storage/services/photo.service';
import { APP_CONFIG } from './lib/constants';
import {
  clearPendingShare,
  hasPendingShare,
  markShareArrival,
  takeSharedImages,
} from './lib/share-target';
import { showToast } from './lib/toast';
import type { ImageKind } from './lib/image-source';
import { Loader2 } from 'lucide-react';

export default function App() {
  const { status, database } = useAppDatabase();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'reports'>('dashboard');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scanInitialMode, setScanInitialMode] = useState<ImageKind | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [lightboxPhotoUrl, setLightboxPhotoUrl] = useState<string | null>(null);
  const [sharedQueue, setSharedQueue] = useState<File[]>([]);
  const currentSharedImage = sharedQueue[0] ?? null;

  const { transactions, summary, deleteTransaction } = useTransactions();
  const { categories, addCategory, removeCategory } = useCategories();
  const { saveTransaction } = useCreateTransaction();

  useEffect(() => {
    void initializeApp();
  }, []);

  useEffect(() => {
    markShareArrival();
    if (status !== 'ready' || !hasPendingShare()) return;

    void (async () => {
      const images = await takeSharedImages();
      clearPendingShare();
      if (!images.length) {
        showToast('Gambar kiriman tidak terbaca. Coba lewat tombol Foto Struk Kas.', 'error');
        return;
      }
      if (images.length > 1) {
        showToast(`${images.length} struk diterima, diproses satu per satu.`, 'info');
      }
      setSharedQueue(images);
    })();
  }, [status]);

  useEffect(() => {
    if (!currentSharedImage) return;
    setScanInitialMode(null);
    setIsScanModalOpen(true);
  }, [currentSharedImage]);

  const handleSaveFromScan = async (input: CreateTransactionInput) => {
    await saveTransaction(input);
  };

  const handleSaveFromManual = async (input: CreateTransactionInput) => {
    await saveTransaction(input);
    setIsManualModalOpen(false);
  };

  const handleDeleteTransaction = async (id: string) => {
    const photoRef = selectedTransaction?.id === id ? selectedTransaction.photo_url : undefined;
    await deleteTransaction(id);
    if (photoRef) await deleteReceiptPhoto(photoRef);
    setSelectedTransaction(null);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-3 text-slate-500">
        <KasKilatMark
          className="w-12 h-12 drop-shadow-[0_6px_14px_rgba(5,150,105,0.3)]"
          label="KasKilat"
        />
        <div className="flex items-center gap-2 text-xs">
          <Loader2 className="w-4 h-4 animate-spin" />
          Menyiapkan {APP_CONFIG.NAME}...
        </div>
      </div>
    );
  }

  if (status === 'onboarding' || !database) return <OnboardingScreen />;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      <AppHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onAddClick={() => setIsAddModalOpen(true)}
        onOpenCategories={() => setIsCategoryModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 pb-24 md:pb-12">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <BalanceSummaryCard
              summary={summary}
              template={database.template}
              onScanClick={() => setIsAddModalOpen(true)}
            />
            <CashflowChart30Days transactions={transactions} />
            <RecentTransactionsList
              transactions={transactions}
              categories={categories}
              onViewAll={() => setActiveTab('transactions')}
              onSelectTransaction={setSelectedTransaction}
              onScanClick={() => setIsAddModalOpen(true)}
              onPhotoClick={setLightboxPhotoUrl}
            />
          </div>
        )}

        {activeTab === 'transactions' && (
          <TransactionListView
            transactions={transactions}
            categories={categories}
            onSelectTransaction={setSelectedTransaction}
            onScanClick={() => setIsAddModalOpen(true)}
            onPhotoClick={setLightboxPhotoUrl}
          />
        )}

        {activeTab === 'reports' && <ReportView transactions={transactions} categories={categories} />}
      </main>

      <BottomNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onAddClick={() => setIsAddModalOpen(true)}
        onOpenCategories={() => setIsCategoryModalOpen(true)}
      />

      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCamera={() => {
          setIsAddModalOpen(false);
          setScanInitialMode('photo');
          setIsScanModalOpen(true);
        }}
        onScreenshot={() => {
          setIsAddModalOpen(false);
          setScanInitialMode('screenshot');
          setIsScanModalOpen(true);
        }}
        onManual={() => {
          setIsAddModalOpen(false);
          setIsManualModalOpen(true);
        }}
      />

      <ScanReceiptModal
        isOpen={isScanModalOpen}
        initialMode={scanInitialMode}
        initialImage={currentSharedImage}
        onClose={() => {
          setScanInitialMode(null);
          if (sharedQueue.length > 1) {
            setSharedQueue((queue) => queue.slice(1));
            return;
          }
          setSharedQueue([]);
          setIsScanModalOpen(false);
        }}
        categories={categories}
        onTransactionSaved={handleSaveFromScan}
        onOpenSettings={() => {
          setIsScanModalOpen(false);
          setScanInitialMode(null);
          setIsSettingsModalOpen(true);
        }}
      />

      <ManualTransactionModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        categories={categories}
        onSave={handleSaveFromManual}
      />

      <TransactionDetailModal
        isOpen={Boolean(selectedTransaction)}
        onClose={() => setSelectedTransaction(null)}
        transaction={selectedTransaction}
        category={categories.find((c) => c.id === selectedTransaction?.category_id)}
        onDelete={handleDeleteTransaction}
      />

      <CategoryListModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        onAddCategory={addCategory}
        onDeleteCategory={removeCategory}
      />

      <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} />

      <PhotoLightboxModal
        photoUrl={lightboxPhotoUrl}
        onClose={() => setLightboxPhotoUrl(null)}
      />

      <ToastHost />
    </div>
  );
}
