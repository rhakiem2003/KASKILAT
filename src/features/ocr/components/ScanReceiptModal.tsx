/**
 * @file ScanReceiptModal.tsx
 * @description Alur OCR: kamera (Gemini → Tesseract) atau screenshot (Tesseract → Gemini),
 * lalu verifikasi data sebelum disimpan.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { createTransactionId } from '../../database/services/database-utils';
import { suggestCategoryId } from '../utils/category-suggestions';
import { detectImageKind, type ImageKind } from '../../../lib/image-source';
import { showToast } from '../../../lib/toast';

interface ScanReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onTransactionSaved: (input: CreateTransactionInput) => Promise<unknown>;
  onOpenSettings?: () => void;
  /** Sumber yang sudah dipilih di menu sebelumnya; langsung membuka kamera / file. */
  initialMode?: ImageKind | null;
  /** Gambar kiriman menu "Bagikan" HP; langsung dibaca tanpa memilih file lagi. */
  initialImage?: File | null;
}

export const ScanReceiptModal: React.FC<ScanReceiptModalProps> = ({
  isOpen,
  onClose,
  categories,
  onTransactionSaved,
  onOpenSettings,
  initialMode = null,
  initialImage = null,
}) => {
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<string | File | null>(null);
  const [imageKind, setImageKind] = useState<ImageKind>('photo');
  const [parsedData, setParsedData] = useState<ParsedOCRData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoWarning, setPhotoWarning] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [progressState, setProgressState] = useState<OCRProgressState>({
    status: 'idle',
    progress: 0,
    message: '',
  });

  const suggestedCategoryId = useMemo(() => {
    if (!parsedData) return null;
    const text = [parsedData.merchant, parsedData.description, parsedData.rawText]
      .filter(Boolean)
      .join(' ');
    return suggestCategoryId(text, parsedData.detectedType, categories);
  }, [parsedData, categories]);

  const handleReset = () => {
    setPreviewImageUrl(null);
    setPendingImage(null);
    setParsedData(null);
    setIsSubmitting(false);
    setPhotoWarning(null);
    setIsSaved(false);
    setImageKind('photo');
    setProgressState({ status: 'idle', progress: 0, message: '' });
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleImageSelected = async (
    imageSource: string | File,
    previewUrl: string,
    kind: ImageKind
  ) => {
    setPreviewImageUrl(previewUrl);
    setPendingImage(imageSource);
    setImageKind(kind);
    try {
      const result = await recognizeReceipt(
        imageSource,
        (state) => {
          setProgressState(state);
        },
        { kind }
      );

      if (result.engine === 'tesseract' && result.parsed.fallbackReason) {
        showToast('Gemini gagal, pakai OCR offline', 'info');
      }

      setParsedData(result.parsed);
    } catch (err) {
      console.warn('OCR gagal, lanjut isi manual:', err);
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

  const loadedShareRef = useRef<File | null>(null);

  useEffect(() => {
    if (!isOpen || !initialImage || loadedShareRef.current === initialImage) return;
    loadedShareRef.current = initialImage;
    void handleImageSelected(
      initialImage,
      URL.createObjectURL(initialImage),
      detectImageKind(initialImage)
    );
  }, [isOpen, initialImage]);

  const handleSaveTransaction = async (data: CreateTransactionInput) => {
    setIsSubmitting(true);
    let warning: string | null = null;
    const transactionId = data.id ?? createTransactionId();

    try {
      let photoUrl = data.photo_url;

      if (pendingImage) {
        try {
          const saved = await saveReceiptPhoto(pendingImage, { transactionId });
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

      await onTransactionSaved({ ...data, id: transactionId, photo_url: photoUrl });

      if (warning) {
        setPhotoWarning(warning);
        setIsSaved(true);
      } else {
        handleClose();
      }
    } catch (err) {
      console.error('Gagal menyimpan transaksi:', err);
      showToast('Gagal menyimpan transaksi. Coba lagi.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={previewImageUrl ? 'Verifikasi Data Struk' : 'Catat dari Foto / Screenshot'}
      description={
        previewImageUrl
          ? 'Periksa kembali data yang dibaca otomatis sebelum disimpan'
          : 'Pilih kamera untuk struk kertas, atau unggah screenshot bukti transfer'
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
                    Foto disimpan sementara di HP ini. Buka Pengaturan untuk menguji koneksi Drive
                    atau unggah ulang foto lokal.
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
          <PhotoUploader onImageSelected={handleImageSelected} autoStart={initialMode} />
        ) : (
          <>
            <OCRResultPreview
              progressState={progressState}
              parsedData={parsedData}
              previewImageUrl={previewImageUrl}
            />

            {parsedData && (
              <VerifyOCRForm
                key={`${imageKind}-${parsedData.merchant ?? ''}-${parsedData.amount ?? 0}`}
                parsedData={parsedData}
                categories={categories}
                photoUrl={previewImageUrl}
                suggestedCategoryId={suggestedCategoryId}
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
