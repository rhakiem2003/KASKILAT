/**
 * @file ScanReceiptModal.tsx
 * @description Dialog modal alur pemindaian foto struk otomatis dan verifikasi sebelum simpan.
 */

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Settings } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { PhotoUploader } from './PhotoUploader';
import { OCRResultPreview } from './OCRResultPreview';
import { VerifyOCRForm } from '../../transactions/components/VerifyOCRForm';
import { Category } from '../../categories/types/category.type';
import { CreateTransactionInput } from '../../transactions/types/transaction.type';
import { OCRProgressState, ParsedOCRData } from '../types/ocr.type';
import { recognizeReceipt } from '../services/ocr.service';
import { saveReceiptPhoto } from '../../storage/services/photo.service';

interface ScanReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onTransactionSaved: (input: CreateTransactionInput) => Promise<unknown>;
  onOpenSettings?: () => void;
}

export const ScanReceiptModal: React.FC<ScanReceiptModalProps> = ({
  isOpen,
  onClose,
  categories,
  onTransactionSaved,
  onOpenSettings,
}) => {
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<string | File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedOCRData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoWarning, setPhotoWarning] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [progressState, setProgressState] = useState<OCRProgressState>({
    status: 'idle',
    progress: 0,
    message: '',
  });

  const handleReset = () => {
    setPreviewImageUrl(null);
    setPendingImage(null);
    setParsedData(null);
    setIsSubmitting(false);
    setPhotoWarning(null);
    setIsSaved(false);
    setProgressState({ status: 'idle', progress: 0, message: '' });
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleImageSelected = async (imageSource: string | File, previewUrl: string) => {
    setPreviewImageUrl(previewUrl);
    setPendingImage(imageSource);
    try {
      // Screenshot → Tesseract, foto kamera → Gemini AI (fallback otomatis)
      const result = await recognizeReceipt(imageSource, (state) => {
        setProgressState(state);
      });

      setParsedData(result.parsed);
    } catch (err) {
      console.warn('OCR gagal, lanjut isi manual:', err);
      // Jika terjadi kendala OCR, izinkan pengguna tetap mengisi data manual dengan foto tetap tersimpan
      setParsedData({
        amount: null,
        date: new Date().toISOString().split('T')[0],
        merchant: null,
        detectedType: 'out',
        paymentMethod: 'Tunai',
        confidence: 0,
        rawText: '',
      });
    }
  };

  const handleSaveTransaction = async (data: CreateTransactionInput) => {
    setIsSubmitting(true);
    let warning: string | null = null;
    try {
      let photoUrl = data.photo_url;

      if (pendingImage) {
        try {
          const saved = await saveReceiptPhoto(pendingImage);
          photoUrl = saved.ref;
          warning = saved.warning || null;
        } catch (photoError) {
          warning =
            photoError instanceof Error
              ? photoError.message
              : 'Foto struk gagal disimpan di perangkat.';
          console.warn('Gagal menyimpan foto struk:', photoError);
        }
      }

      await onTransactionSaved({ ...data, photo_url: photoUrl });

      if (warning) {
        // Biarkan modal terbuka agar kegagalan Drive terlihat, bukan hilang senyap
        setPhotoWarning(warning);
        setIsSaved(true);
      } else {
        handleClose();
      }
    } catch (err) {
      console.error('Gagal menyimpan transaksi:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={previewImageUrl ? 'Verifikasi Data Struk' : 'Foto Bukti Transaksi Kas'}
      description={
        previewImageUrl
          ? 'Periksa kembali data yang otomatis dibaca oleh sistem sebelum disimpan'
          : 'Jepret atau pilih foto nota belanja / bukti transfer pembayaran'
      }
      maxWidth="lg"
    >
      <div className="space-y-4">
        {isSaved ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2.5 p-3 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="text-xs leading-relaxed">
                Transaksi berhasil disimpan ke buku kas.
              </span>
            </div>

            {photoWarning && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed space-y-1">
                  <p className="font-semibold">Foto belum masuk ke Google Drive</p>
                  <p>{photoWarning}</p>
                  <p>
                    Foto sementara disimpan di perangkat. Buka Pengaturan → Google Drive untuk
                    menguji koneksi atau mengunggah ulang foto lokal.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5">
              {photoWarning && onOpenSettings && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleReset();
                    onOpenSettings();
                  }}
                  leftIcon={<Settings className="w-3.5 h-3.5" />}
                >
                  Buka Pengaturan
                </Button>
              )}
              <Button variant="primary" size="sm" onClick={handleClose}>
                Tutup
              </Button>
            </div>
          </div>
        ) : !previewImageUrl ? (
          <PhotoUploader onImageSelected={handleImageSelected} />
        ) : (
          <>
            <OCRResultPreview
              progressState={progressState}
              parsedData={parsedData}
              previewImageUrl={previewImageUrl}
            />

            {parsedData && (
              <VerifyOCRForm
                parsedData={parsedData}
                categories={categories}
                photoUrl={previewImageUrl}
                isSubmitting={isSubmitting}
                onSave={handleSaveTransaction}
                onCancel={handleReset}
              />
            )}
          </>
        )}
      </div>
    </Modal>
  );
};
