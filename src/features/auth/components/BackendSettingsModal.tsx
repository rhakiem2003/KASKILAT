/**
 * @file BackendSettingsModal.tsx
 * @description Pengaturan integrasi: Gemini API key, Google Drive (OAuth), status Supabase, dan reset data.
 */

import React, { useEffect, useState } from 'react';
import {
  RefreshCw,
  HardDrive,
  KeyRound,
  Link2,
  Unlink,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  UploadCloud,
  FolderOpen,
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { getBackendConnectionStatus } from '../../../lib/supabase-client';
import { getIntegrationSettings, saveIntegrationSettings } from '../../../lib/settings';
import {
  connectDrive,
  disconnectDrive,
  getCachedFolderUrl,
  getConnectedDriveEmail,
  isDriveConnected,
  testDriveUpload,
} from '../../storage/services/drive.service';
import { migratePhotoToDrive } from '../../storage/services/photo.service';
import { getTransactions, updateTransaction } from '../../transactions/services/transaction.service';

interface BackendSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetData: () => void;
}

type Notice = { tone: 'success' | 'error' | 'info'; text: string };

export const BackendSettingsModal: React.FC<BackendSettingsModalProps> = ({
  isOpen,
  onClose,
  onResetData,
}) => {
  const status = getBackendConnectionStatus();

  const [geminiKey, setGeminiKey] = useState('');
  const [clientId, setClientId] = useState('');
  const [driveEmail, setDriveEmail] = useState<string | null>(null);
  const [driveConnected, setDriveConnected] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTestingDrive, setIsTestingDrive] = useState(false);
  const [folderUrl, setFolderUrl] = useState<string | null>(null);
  const [testFileUrl, setTestFileUrl] = useState<string | null>(null);
  const [localPhotos, setLocalPhotos] = useState<Array<{ id: string; ref: string }>>([]);
  const [isMigrating, setIsMigrating] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const settings = getIntegrationSettings();
    setGeminiKey(settings.geminiApiKey);
    setClientId(settings.googleClientId);
    setDriveConnected(isDriveConnected());
    setDriveEmail(getConnectedDriveEmail());
    setFolderUrl(getCachedFolderUrl());
    setTestFileUrl(null);
    setNotice(null);

    let cancelled = false;
    getTransactions()
      .then((list) => {
        if (cancelled) return;
        setLocalPhotos(
          list
            .filter((tx) => tx.photo_url && tx.photo_url.startsWith('local://'))
            .map((tx) => ({ id: tx.id, ref: tx.photo_url as string }))
        );
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const persist = () =>
    saveIntegrationSettings({
      geminiApiKey: geminiKey.trim(),
      googleClientId: clientId.trim(),
    });

  const handleSave = () => {
    setIsSaving(true);
    persist();
    setIsSaving(false);
    setNotice({
      tone: 'success',
      text: 'Kredensial tersimpan. OCR foto kamera & Drive memakai pengaturan ini.',
    });
  };

  const handleConnect = async () => {
    persist();
    if (!clientId.trim()) {
      setNotice({ tone: 'error', text: 'Isi Google OAuth Client ID terlebih dahulu.' });
      return;
    }
    setIsConnecting(true);
    setNotice(null);
    try {
      const result = await connectDrive();
      setDriveConnected(isDriveConnected());
      setDriveEmail(result.email || getConnectedDriveEmail());
      setFolderUrl(getCachedFolderUrl());
      setNotice({
        tone: 'success',
        text: 'Google Drive terhubung. Klik "Tes unggah ke Drive" untuk memastikan folder & izin berfungsi.',
      });
    } catch (error) {
      setNotice({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Gagal menghubungkan Google Drive.',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnectDrive();
    setDriveConnected(false);
    setDriveEmail(null);
    setFolderUrl(null);
    setTestFileUrl(null);
    setNotice({
      tone: 'info',
      text: 'Google Drive diputuskan. Foto baru disimpan di perangkat (IndexedDB).',
    });
  };

  const handleTestDrive = async () => {
    setIsTestingDrive(true);
    setNotice(null);
    try {
      const result = await testDriveUpload();
      setDriveConnected(true);
      setFolderUrl(result.folderUrl);
      setTestFileUrl(result.fileUrl);
      setNotice({
        tone: 'success',
        text: `Koneksi Drive berhasil. File uji "${result.fileName}" sudah diunggah ke folder "KasKilat UMKM".`,
      });
    } catch (error) {
      setNotice({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Uji unggah ke Drive gagal.',
      });
    } finally {
      setIsTestingDrive(false);
    }
  };

  const handleMigrateLocalPhotos = async () => {
    if (localPhotos.length === 0) return;
    setIsMigrating(true);
    setNotice(null);

    let uploaded = 0;
    let failed = 0;
    const remaining: Array<{ id: string; ref: string }> = [];

    for (const photo of localPhotos) {
      try {
        const newRef = await migratePhotoToDrive(photo.ref);
        if (!newRef) {
          failed += 1;
          remaining.push(photo);
          continue;
        }
        await updateTransaction(photo.id, { photo_url: newRef });
        uploaded += 1;
      } catch (error) {
        console.warn('[Settings] Gagal memindahkan foto ke Drive:', error);
        failed += 1;
        remaining.push(photo);
      }
    }

    setLocalPhotos(remaining);
    setIsMigrating(false);
    setFolderUrl(getCachedFolderUrl());
    setNotice(
      uploaded > 0
        ? {
            tone: failed > 0 ? 'info' : 'success',
            text:
              `${uploaded} foto berhasil dipindah ke Google Drive.` +
              (failed > 0
                ? ` ${failed} foto gagal (bisa dicoba lagi; pastikan blob lokal masih ada).`
                : ''),
          }
        : {
            tone: 'error',
            text: 'Tidak ada foto yang berhasil diunggah. Jalankan "Tes unggah ke Drive" untuk melihat penyebabnya.',
          }
    );
  };

  const handleCopyOrigin = async () => {
    try {
      await navigator.clipboard.writeText(origin);
      setNotice({
        tone: 'success',
        text: 'Origin disalin. Tempel di Authorized JavaScript origins.',
      });
    } catch {
      setNotice({ tone: 'error', text: 'Gagal menyalin. Salin origin secara manual.' });
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset data transaksi dan kembalikan ke 3 contoh data dummy awal?')) {
      onResetData();
      setResetDone(true);
      setTimeout(() => setResetDone(false), 2000);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pengaturan Integrasi"
      description="Gemini AI untuk OCR foto, Google Drive untuk foto struk, dan status database"
      maxWidth="lg"
    >
      <div className="space-y-4 text-xs">
        {notice && (
          <div
            className={`flex items-start gap-2 p-3 rounded-xl border ${
              notice.tone === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
                : notice.tone === 'error'
                  ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            {notice.tone === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <Check className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed">{notice.text}</span>
          </div>
        )}

        {/* Google Drive */}
        <section className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
              <HardDrive className="w-4 h-4 text-emerald-600" />
              <span>Google Drive (foto struk)</span>
            </div>
            <span
              className={`px-2.5 py-1 rounded-md font-semibold text-[11px] ${
                driveConnected
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                  : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
              }`}
            >
              {driveConnected ? 'Terhubung' : 'Belum terhubung'}
            </span>
          </div>

          <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
            {driveConnected
              ? `Foto disimpan privat di folder "KasKilat UMKM"${driveEmail ? ` (${driveEmail})` : ''}.`
              : 'Selama belum terhubung, foto disimpan di perangkat (IndexedDB) dan tetap bertahan setelah reload.'}
          </p>

          <Input
            label="Google OAuth Client ID"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="xxxxx.apps.googleusercontent.com"
            autoComplete="off"
          />

          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-slate-500 shrink-0">Origin terdaftar:</span>
            <code className="font-mono text-[10px] text-slate-700 dark:text-slate-300 truncate">
              {origin}
            </code>
            <button
              type="button"
              onClick={handleCopyOrigin}
              className="ml-auto text-slate-500 hover:text-emerald-600 shrink-0"
              aria-label="Salin origin"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {driveConnected ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleDisconnect}
                leftIcon={<Unlink className="w-3.5 h-3.5" />}
              >
                Putuskan Drive
              </Button>
            ) : (
              <Button
                size="sm"
                variant="primary"
                onClick={handleConnect}
                isLoading={isConnecting}
                leftIcon={<Link2 className="w-3.5 h-3.5" />}
              >
                Hubungkan Google Drive
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={handleTestDrive}
              isLoading={isTestingDrive}
              disabled={!driveConnected || isTestingDrive}
              leftIcon={<UploadCloud className="w-3.5 h-3.5" />}
            >
              Tes unggah ke Drive
            </Button>

            {driveConnected && localPhotos.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleMigrateLocalPhotos}
                isLoading={isMigrating}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                {isMigrating
                  ? 'Mengunggah foto...'
                  : `Unggah ${localPhotos.length} foto lokal ke Drive`}
              </Button>
            )}

            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Buka Google Cloud Console
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {(folderUrl || testFileUrl) && (
            <div className="flex flex-wrap items-center gap-3 text-[11px]">
              {folderUrl && (
                <a
                  href={folderUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  <FolderOpen className="w-3 h-3" />
                  Buka folder di Drive
                </a>
              )}
              {testFileUrl && (
                <a
                  href={testFileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  Buka file uji
                </a>
              )}
            </div>
          )}

          {driveConnected && localPhotos.length > 0 && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-relaxed">
              {localPhotos.length} transaksi masih memakai foto lokal (IndexedDB). Foto lama tidak
              otomatis terunggah saat Drive dihubungkan; gunakan tombol di atas untuk memindahkannya.
            </p>
          )}

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Buat OAuth Client ID tipe <strong>Web application</strong>, aktifkan{' '}
            <strong>Google Drive API</strong>, lalu tambahkan origin di atas ke{' '}
            <strong>Authorized JavaScript origins</strong>. Aplikasi hanya meminta akses file yang
            dibuatnya sendiri (scope <code>drive.file</code>).
          </p>
        </section>

        {/* Gemini */}
        <section className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
            <KeyRound className="w-4 h-4 text-emerald-600" />
            <span>Gemini AI (OCR foto kamera)</span>
            {geminiKey.trim() && (
              <span className="ml-auto px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-semibold text-[10px]">
                Aktif
              </span>
            )}
          </div>

          <Input
            type="password"
            label="Gemini API Key"
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
            placeholder="AIza..."
            autoComplete="off"
            helperText="Gratis di Google AI Studio (free tier). Tanpa key, semua gambar diproses Tesseract offline."
          />

          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Ambil Gemini API key gratis
            <ExternalLink className="w-3 h-3" />
          </a>
        </section>

        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Screenshot diproses offline dengan Tesseract; foto kamera memakai Gemini.
          </span>
          <Button
            size="sm"
            variant="primary"
            onClick={handleSave}
            isLoading={isSaving}
            leftIcon={<Check className="w-3.5 h-3.5" />}
          >
            Simpan
          </Button>
        </div>

        {/* Supabase */}
        <section className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-500 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Supabase
            </span>
            <span
              className={`px-2.5 py-1 rounded-md font-semibold text-[11px] ${
                status.isConfigured
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                  : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
              }`}
            >
              {status.isConfigured ? 'Terkoneksi' : 'Mode Offline / Lokal'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500">Penyimpanan data kas:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {status.isConfigured ? 'PostgreSQL Cloud + RLS' : 'localStorage browser'}
            </span>
          </div>

          {status.url && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Endpoint:</span>
              <span className="font-mono text-[10px] text-slate-600 dark:text-slate-400 truncate max-w-[220px]">
                {status.url}
              </span>
            </div>
          )}

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Migrasi SQL tersedia di <code>supabase/migrations.sql</code>.
          </p>
        </section>

        {/* Reset dummy data */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
          <Button
            size="sm"
            variant="outline"
            onClick={handleReset}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            {resetDone ? 'Data Direset!' : 'Reset ke 3 Data Dummy'}
          </Button>

          <Button size="sm" variant="secondary" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </Modal>
  );
};
