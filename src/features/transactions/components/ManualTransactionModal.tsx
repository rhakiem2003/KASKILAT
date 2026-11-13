/**
 * @file ManualTransactionModal.tsx
 * @description Dialog modal untuk input kas masuk atau kas keluar secara manual tanpa foto.
 */

import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { VerifyOCRForm } from './VerifyOCRForm';
import { Category } from '../../categories/types/category.type';
import { CreateTransactionInput } from '../types/transaction.type';

interface ManualTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onSave: (data: CreateTransactionInput) => Promise<unknown>;
}

export const ManualTransactionModal: React.FC<ManualTransactionModalProps> = ({
  isOpen,
  onClose,
  categories,
  onSave,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async (data: CreateTransactionInput) => {
    setIsSubmitting(true);
    try {
      await onSave(data);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Catat Transaksi Manual"
      description="Masukkan rincian kas masuk atau kas keluar usaha Anda"
      maxWidth="md"
    >
      <VerifyOCRForm
        parsedData={null}
        categories={categories}
        isSubmitting={isSubmitting}
        onSave={handleSave}
        onCancel={onClose}
      />
    </Modal>
  );
};
