/**
 * @file PhotoLightboxModal.tsx
 * @description Modal pratinjau pembesar foto struk resolusi penuh dengan latar belakang redup.
 */

import React from 'react';
import { X } from 'lucide-react';

interface PhotoLightboxModalProps {
  photoUrl: string | null;
  onClose: () => void;
}

export const PhotoLightboxModal: React.FC<PhotoLightboxModalProps> = ({
  photoUrl,
  onClose,
}) => {
  if (!photoUrl) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors"
        aria-label="Tutup foto"
      >
        <X className="w-5 h-5" />
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        className="max-w-2xl max-h-[85vh] rounded-2xl overflow-hidden bg-slate-900 shadow-2xl"
      >
        <img
          src={photoUrl}
          alt="Foto Bukti Struk Lengkap"
          className="w-full h-full object-contain max-h-[80vh]"
        />
      </div>
    </div>
  );
};
