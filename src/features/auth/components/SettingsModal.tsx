/**
 * @file SettingsModal.tsx
 * @description Straightforward local storage, export/restore, and optional advanced OCR settings.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Download, FileUp, KeyRound, ShieldCheck, Smartphone, ExternalLink } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useAppDatabase } from '../../database/hooks/useAppDatabase';
import { createBackupFile, restoreBackupFile } from '../../storage/services/backup.service';
import {
  getGeminiKeySource,
  getUserGeminiKey,
  maskApiKey,
  saveGeminiApiKey,
  testGeminiKey,
  type GeminiKeyTestResult,
} from '../../../lib/gemini-settings';
import { APP_CONFIG } from '../../../lib/constants';
import { showToast } from '../../../lib/toast';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { database } = useAppDatabase();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [backupInfo, setBackupInfo] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [geminiDraft, setGeminiDraft] = useState('');
  const [keySource, setKeySource] = useState(getGeminiKeySource());
  const [testBusy, setTestBusy] = useState(false);
  const [testResult, setTestResult] = useState<GeminiKeyTestResult | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setBackupInfo(null);
    setGeminiDraft(getUserGeminiKey());
    setKeySource(getGeminiKeySource());
    setTestResult(null);
  }, [isOpen]);

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const handleExport = async () => {
    if (backupBusy) return;
    setBackupBusy(true);
    setBackupInfo(null);
    try {
      const backup = await createBackupFile();
      const backupFile = new File([backup.blob], backup.fileName, { type: backup.blob.type });

      // Android/desktop browsers that support file sharing can send the backup
      // straight to Google Drive from the system share sheet.
      if (
        typeof navigator.share === 'function' &&
        (!navigator.canShare || navigator.canShare({ files: [backupFile] }))
      ) {
        try {
          await navigator.share({
            files: [backupFile],
            title: 'Cadangan KasKilat',
            text: 'Simpan file ini ke Google Drive atau tempat aman lainnya.',
          });
        } catch (shareError) {
          if (shareError instanceof Error && shareError.name === 'AbortError') return;
          downloadBlob(backup.blob, backup.fileName);
        }
      } else {
        downloadBlob(backup.blob, backup.fileName);
      }

      const warning = backup.missingPhotoCount > 0
        ? ` ${backup.missingPhotoCount} foto lama tidak tersedia di perangkat dan tidak ikut tersalin.`
        : '';
      setBackupInfo(
        `Cadangan berisi ${backup.transactionCount} transaksi dan ${backup.photoCount} foto.${warning}`
      );
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Gagal membuat file backup.', 'error');
    } finally {
      setBackupBusy(false);
    }
  };

  const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const confirmRestore = window.confirm(
      'Data dari file akan digabungkan dengan catatan di perangkat ini. Catatan yang sudah ada tidak akan dihapus. Lanjutkan?'
    );
    if (!confirmRestore) return;

    setRestoreBusy(true);
    setBackupInfo(null);
    try {
      const result = await restoreBackupFile(file);
      setBackupInfo(
        `Berhasil memulihkan ${result.transactionCount} transaksi dan ${result.photoCount} foto. Data lama tetap dipertahankan.`
      );
      showToast('Backup berhasil dipulihkan.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Gagal memulihkan backup.', 'error');
    } finally {
      setRestoreBusy(false);
    }
  };

  const handleSaveKey = () => {
    saveGeminiApiKey(geminiDraft);
    setGeminiDraft(getUserGeminiKey());
    setKeySource(getGeminiKeySource());
    setTestResult(null);
    showToast(
      geminiDraft.trim() ? 'Gemini API key disimpan di perangkat ini.' : 'Gemini API key dihapus.',
      'success'
    );
  };

  const handleTestKey = async () => {
    setTestBusy(true);
    setTestResult(null);
    try {
      const result = await testGeminiKey(geminiDraft.trim() || undefined);
      setTestResult(result);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Tidak dapat menguji Gemini API key.', 'error');
    } finally {
      setTestBusy(false);
    }
  };

  const transactionCount = database?.transactions.length ?? 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pengaturan"
      description="Simpan data dengan aman. Tanpa akun dan tanpa sinkronisasi otomatis."
      maxWidth="lg"
    >
      <div className="space-y-5">
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400">Data & Backup</h4>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Tersimpan di perangkat ini
              </span>
              <span className="text-[11px] text-slate-500 tabular-nums">{transactionCount} transaksi</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Catatan tersimpan otomatis di perangkat. Tidak perlu login. Buat cadangan saat kamu
              ingin memindahkan data atau menyimpannya ke Google Drive.
            </p>
            <Button
              variant="primary"
              className="w-full"
              onClick={handleExport}
              isLoading={backupBusy}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Simpan / bagikan file backup
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".kaskilat,.json,application/json"
              className="hidden"
              onChange={handleRestore}
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              isLoading={restoreBusy}
              disabled={restoreBusy}
              leftIcon={<FileUp className="w-4 h-4" />}
            >
              Pulihkan dari file backup
            </Button>
            {backupInfo && (
              <p className="text-[11px] leading-relaxed text-emerald-700 dark:text-emerald-400">
                {backupInfo}
              </p>
            )}
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Pilih Google Drive dari menu Bagikan (bila tersedia), atau simpan file lalu unggah
              sendiri ke Drive. KasKilat tidak meminta akses ke akun Google kamu.
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setAdvancedOpen((open) => !open)}
            aria-expanded={advancedOpen}
            className="w-full flex items-center justify-between gap-3 p-3.5 text-left"
          >
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Pengaturan lanjutan
            </span>
            <span className="text-xs text-slate-400">{advancedOpen ? 'Tutup' : 'Buka'}</span>
          </button>

          {advancedOpen && (
            <div className="p-3.5 pt-0 space-y-3">
              <div className="flex items-start gap-2 text-[11px] leading-relaxed">
                <KeyRound className="w-4 h-4 shrink-0 mt-0.5 text-slate-500" />
                <span className="text-slate-600 dark:text-slate-400">
                  {keySource === 'none'
                    ? 'Pembacaan gambar memakai Tesseract secara lokal. Gemini AI adalah pilihan tambahan.'
                    : <>Gemini key aktif: <span className="font-mono">{maskApiKey(getUserGeminiKey())}</span></>}
                </span>
              </div>

              <Input
                type="password"
                value={geminiDraft}
                onChange={(event) => setGeminiDraft(event.target.value)}
                placeholder="Gemini API key (opsional)"
                autoComplete="off"
                helperText="Key disimpan hanya di perangkat ini dan dikirim langsung ke Google saat dipakai."
              />

              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={handleSaveKey}>Simpan Key</Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestKey}
                  isLoading={testBusy}
                  leftIcon={<KeyRound className="w-3.5 h-3.5" />}
                >
                  Tes Key
                </Button>
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Gemini API
                </a>
              </div>

              {testResult && (
                <p className={`text-[11px] leading-relaxed ${
                  testResult.status === 'valid'
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {testResult.message}
                </p>
              )}
            </div>
          )}
        </section>

        <section className="flex items-start gap-2.5 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
          <div>
            <p className="font-semibold text-slate-700 dark:text-slate-300">Privasi</p>
            <p>
              Data keuangan disimpan di perangkat. File backup hanya dibagikan ke lokasi yang
              kamu pilih sendiri. Menghapus data browser dapat menghapus catatan lokal, jadi buat
              cadangan berkala.
            </p>
            <a
              href="/privacy"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 mt-1 font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
            >
              <ExternalLink className="w-3 h-3" />
              Kebijakan Privasi
            </a>
          </div>
        </section>

        <p className="text-center text-[10px] text-slate-400">
          {APP_CONFIG.NAME} v{APP_CONFIG.VERSION} — {APP_CONFIG.TAGLINE}
        </p>
      </div>
    </Modal>
  );
};
