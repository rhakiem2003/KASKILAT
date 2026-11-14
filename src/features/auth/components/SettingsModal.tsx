/**
 * @file SettingsModal.tsx
 * @description Pengaturan akun Google/Drive, kunci Gemini milik pengguna, dan info privasi.
 * Pengguna tidak pernah melihat atau mengisi Client ID OAuth.
 */

import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Cloud,
  CloudOff,
  ExternalLink,
  ImageUp,
  KeyRound,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  XCircle,
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useAppDatabase } from '../../database/hooks/useAppDatabase';
import {
  countLocalPhotos,
  logout,
  startWithGoogle,
  syncNow,
  uploadLocalPhotosToDrive,
} from '../../database/services/database-store';
import {
  getCachedFolderUrl,
  testDriveUpload,
} from '../../storage/services/drive.service';
import {
  getGeminiKeySource,
  getUserGeminiKey,
  maskApiKey,
  saveGeminiApiKey,
  testGeminiKey,
  GeminiKeyTestResult,
} from '../../../lib/gemini-settings';
import { formatSyncTimestamp } from '../../transactions/utils/dateFormatter';
import { APP_CONFIG } from '../../../lib/constants';
import { showToast } from '../../../lib/toast';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function syncLabel(
  phase: ReturnType<typeof useAppDatabase>['sync']['phase'],
  lastSyncedAt: string | null
): string {
  switch (phase) {
    case 'saving':
    case 'syncing':
      return 'Menyimpan...';
    case 'synced':
      return lastSyncedAt ? `Last synced: ${formatSyncTimestamp(lastSyncedAt)}` : 'Tersimpan di Drive';
    case 'offline':
      return 'Offline - tersimpan lokal';
    default:
      return 'Tersimpan lokal di perangkat ini';
  }
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { mode, email, sync } = useAppDatabase();

  const [loginBusy, setLoginBusy] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [driveTestBusy, setDriveTestBusy] = useState(false);
  const [driveTest, setDriveTest] = useState<{ folderUrl?: string; fileUrl?: string; error?: string } | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [localPhotoCount, setLocalPhotoCount] = useState(0);

  const [geminiDraft, setGeminiDraft] = useState('');
  const [keySource, setKeySource] = useState(getGeminiKeySource());
  const [testBusy, setTestBusy] = useState(false);
  const [testResult, setTestResult] = useState<GeminiKeyTestResult | null>(null);

  const folderUrl = getCachedFolderUrl();

  useEffect(() => {
    if (!isOpen) return;
    setLocalPhotoCount(mode === 'account' ? countLocalPhotos() : 0);
    setKeySource(getGeminiKeySource());
    setGeminiDraft(getUserGeminiKey());
    setTestResult(null);
    setDriveTest(null);
  }, [isOpen, mode]);

  const handleLogin = async () => {
    setLoginBusy(true);
    try {
      await startWithGoogle();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Login Google dibatalkan.',
        'error'
      );
    } finally {
      setLoginBusy(false);
    }
  };

  const handleLogout = async () => {
    if (!window.confirm('Keluar dari Google? Data di Drive tetap aman dan tidak dihapus.')) return;
    setLogoutBusy(true);
    try {
      await logout();
      onClose();
    } finally {
      setLogoutBusy(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await syncNow();
    } finally {
      setSyncing(false);
    }
  };

  const handleTestDrive = async () => {
    setDriveTestBusy(true);
    setDriveTest(null);
    try {
      const result = await testDriveUpload();
      setDriveTest({ folderUrl: result.folderUrl, fileUrl: result.fileUrl });
      showToast('Tes unggah berhasil. File ada di folder Drive KasKilat.', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Tes unggah gagal.';
      setDriveTest({ error: message });
      showToast(message, 'error');
    } finally {
      setDriveTestBusy(false);
    }
  };

  const handleUploadPhotos = async () => {
    setPhotoBusy(true);
    try {
      const result = await uploadLocalPhotosToDrive();
      setLocalPhotoCount(countLocalPhotos());
      if (result.moved > 0) {
        showToast(
          `${result.moved} foto dipindah ke Drive${result.failed > 0 ? `, ${result.failed} gagal` : ''}`,
          result.failed > 0 ? 'info' : 'success'
        );
      } else {
        showToast('Tidak ada foto lokal yang perlu diunggah.', 'info');
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Gagal mengunggah foto.', 'error');
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleSaveKey = () => {
    saveGeminiApiKey(geminiDraft);
    setGeminiDraft(getUserGeminiKey());
    setKeySource(getGeminiKeySource());
    setTestResult(null);
    showToast(
      geminiDraft.trim() ? 'Gemini API key disimpan di HP ini.' : 'Gemini API key dihapus.',
      'success'
    );
  };

  const handleTestKey = async () => {
    setTestBusy(true);
    setTestResult(null);
    try {
      const result = await testGeminiKey(geminiDraft.trim() || undefined);
      setTestResult(result);
    } finally {
      setTestBusy(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pengaturan"
      description="Akun, backup Drive, dan kunci Gemini AI"
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Akun & Backup */}
        <section className="space-y-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Akun & Backup
          </h4>

          {mode === 'account' ? (
            <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/20 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Connected as {email}
              </div>

              <p className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                {sync.phase === 'offline' ? (
                  <CloudOff className="w-3.5 h-3.5 text-amber-600" />
                ) : (
                  <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                )}
                {syncLabel(sync.phase, sync.lastSyncedAt)}
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSyncNow}
                  isLoading={syncing}
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Sync sekarang
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestDrive}
                  isLoading={driveTestBusy}
                  leftIcon={<Cloud className="w-3.5 h-3.5" />}
                >
                  Tes unggah ke Drive
                </Button>
                {localPhotoCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUploadPhotos}
                    isLoading={photoBusy}
                    leftIcon={<ImageUp className="w-3.5 h-3.5" />}
                  >
                    Unggah {localPhotoCount} foto lokal
                  </Button>
                )}
              </div>

              {driveTest?.folderUrl && (
                <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1 pt-1">
                  <a
                    href={driveTest.folderUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Buka folder KasKilat di Drive
                  </a>
                  <br />
                  <a
                    href={driveTest.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Lihat file hasil tes
                  </a>
                </div>
              )}
              {driveTest?.error && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 leading-relaxed">
                  {driveTest.error}
                </p>
              )}

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-900/60">
                {folderUrl ? (
                  <a
                    href={folderUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-slate-500 hover:text-emerald-700 inline-flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Folder Drive
                  </a>
                ) : (
                  <span />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  isLoading={logoutBusy}
                  leftIcon={<LogOut className="w-3.5 h-3.5" />}
                  className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                >
                  Logout
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <Smartphone className="w-4 h-4 shrink-0" />
                Mode Tamu — data hanya di HP ini
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Data tersimpan di perangkat ini. Login with Google untuk backup ke Drive & buka di HP
                lain.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={handleLogin}
                isLoading={loginBusy}
                leftIcon={<Cloud className="w-3.5 h-3.5" />}
                className="w-full"
              >
                Login with Google
              </Button>
            </div>
          )}
        </section>

        {/* Gemini AI */}
        <section className="space-y-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Gemini AI untuk Foto Kamera
          </h4>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-3">
            <div className="flex items-start gap-2 text-[11px] leading-relaxed">
              <KeyRound className="w-4 h-4 shrink-0 mt-0.5 text-slate-500" />
              <span className="text-slate-600 dark:text-slate-400">
                {keySource === 'none' ? (
                  <>Offline mode - using Tesseract. Tanpa key, screenshot tetap terbaca offline.</>
                ) : keySource === 'env' ? (
                  <>Memakai key bawaan build ini. Kamu bisa menempel key sendiri di bawah.</>
                ) : (
                  <>Key aktif: <span className="font-mono">{maskApiKey(getUserGeminiKey())}</span></>
                )}
              </span>
            </div>

            <Input
              type="password"
              value={geminiDraft}
              onChange={(e) => setGeminiDraft(e.target.value)}
              placeholder="Tempel Gemini API key di sini"
              autoComplete="off"
              helperText="Key disimpan hanya di HP ini, tidak dikirim ke server kami."
            />

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={handleSaveKey}>
                Simpan Key
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestKey}
                isLoading={testBusy}
                leftIcon={
                  testBusy ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <KeyRound className="w-3.5 h-3.5" />
                  )
                }
              >
                Test Key
              </Button>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Get Free Key
              </a>
            </div>

            {testResult && (
              <p
                className={`flex items-start gap-1.5 text-[11px] leading-relaxed ${
                  testResult.status === 'valid'
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {testResult.status === 'valid' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                )}
                {testResult.message}
              </p>
            )}
          </div>
        </section>

        {/* Privasi */}
        <section className="flex items-start gap-2.5 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
          <div className="space-y-1">
            <p className="font-semibold text-slate-700 dark:text-slate-300">Privasi</p>
            <p>
              Catatan dan foto struk disimpan di HP ini dan/atau Google Drive pribadimu. Foto dari
              aplikasi tidak muncul di Galeri HP.
            </p>
            <p className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5">
              <a
                href="/privacy"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
              >
                <ExternalLink className="w-3 h-3" />
                Kebijakan Privasi
              </a>
              <a
                href="/about"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
              >
                <ExternalLink className="w-3 h-3" />
                Tentang KasKilat
              </a>
            </p>
          </div>
        </section>

        <p className="text-center text-[10px] text-slate-400">
          {APP_CONFIG.NAME} v{APP_CONFIG.VERSION} — {APP_CONFIG.TAGLINE}
        </p>
      </div>
    </Modal>
  );
};
