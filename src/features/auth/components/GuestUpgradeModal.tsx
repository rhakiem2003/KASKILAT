/**
 * @file GuestUpgradeModal.tsx
 * @description Pilihan saat tamu login: pindahkan data lokal ke Drive atau mulai baru.
 */

import React, { useState } from 'react';
import { CloudUpload, HardDrive, Info } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import type { GuestUpgradeRequest } from '../../database/types/database.type';
import { completeGuestUpgrade } from '../../database/services/database-store';

interface GuestUpgradeModalProps {
  request: GuestUpgradeRequest;
}

export const GuestUpgradeModal: React.FC<GuestUpgradeModalProps> = ({ request }) => {
  const [busy, setBusy] = useState<'move' | 'fresh' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChoice = async (choice: 'move' | 'fresh') => {
    setBusy(choice);
    setError(null);
    try {
      await completeGuestUpgrade(choice);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memindahkan data. Coba lagi.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal
      isOpen
      onClose={() => undefined}
      dismissible={false}
      title="Pindahkan data ke Drive?"
      description={`Kamu punya ${request.guestTransactionCount} transaksi di Mode Tamu`}
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          Pindahkan {request.guestTransactionCount} transaksi lokal ke Drive?
        </p>

        {request.hasDriveData && (
          <p className="flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            Sudah ada catatan di Drive akun ini. Data lokal akan digabungkan.
          </p>
        )}

        {error && (
          <p className="text-xs text-rose-600 dark:text-rose-400 leading-relaxed">{error}</p>
        )}

        <div className="space-y-2.5">
          <Button
            variant="primary"
            className="w-full"
            onClick={() => handleChoice('move')}
            isLoading={busy === 'move'}
            disabled={busy !== null}
            leftIcon={<CloudUpload className="w-4 h-4" />}
          >
            Pindahkan ke Drive
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleChoice('fresh')}
            isLoading={busy === 'fresh'}
            disabled={busy !== null}
            leftIcon={<HardDrive className="w-4 h-4" />}
          >
            Mulai Baru
          </Button>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center leading-relaxed">
            Mulai Baru tetap menyimpan data tamu di HP ini sebagai cadangan.
          </p>
        </div>
      </div>
    </Modal>
  );
};
