/**
 * @file GuestWarningModal.tsx
 * @description Peringatan sekali jalan saat tamu menyimpan transaksi pertama.
 */

import React, { useState } from 'react';
import { Cloud, Smartphone } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { startWithGoogle } from '../../database/services/database-store';

interface GuestWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuestWarningModal: React.FC<GuestWarningModalProps> = ({ isOpen, onClose }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setBusy(true);
    setError(null);
    try {
      await startWithGoogle();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login Google dibatalkan.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Mode Tamu"
      description="Transaksi pertama kamu tersimpan di HP ini"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300">
          <Smartphone className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed font-medium">
            Data Tamu hanya di HP ini. Login with Google untuk backup gratis.
          </p>
        </div>

        {error && (
          <p className="text-xs text-rose-600 dark:text-rose-400 leading-relaxed">{error}</p>
        )}

        <div className="flex flex-col sm:flex-row gap-2.5">
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleLogin}
            isLoading={busy}
            leftIcon={<Cloud className="w-4 h-4" />}
          >
            Login with Google
          </Button>
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={busy}>
            Nanti
          </Button>
        </div>
      </div>
    </Modal>
  );
};
