/**
 * @file KasKilatLogo.tsx
 * @description Mark dan wordmark KasKilat. Warna tile konsisten dengan ikon PWA.
 */

import React, { useId } from 'react';
import {
  BOLT_POINTS,
  BOLT_STROKE,
  TILE_FROM,
  TILE_RADIUS,
  TILE_TO,
  VIEW_BOX,
} from './logo-geometry';

const BOLT_POLYGON = BOLT_POINTS.map(([x, y]) => `${x},${y}`).join(' ');

interface MarkProps {
  className?: string;
  /** Isi bila mark berdiri sendiri (mis. ikon tombol). Kosongkan bila sudah ada teks "KasKilat". */
  label?: string;
}

export const KasKilatMark: React.FC<MarkProps> = ({ className = 'w-9 h-9', label }) => {
  const gradientId = `kaskilat-tile-${useId().replace(/:/g, '')}`;

  return (
    <svg
      viewBox={`0 0 ${VIEW_BOX} ${VIEW_BOX}`}
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={TILE_FROM} />
          <stop offset="1" stopColor={TILE_TO} />
        </linearGradient>
      </defs>
      <rect width={VIEW_BOX} height={VIEW_BOX} rx={TILE_RADIUS} fill={`url(#${gradientId})`} />
      <polygon
        points={BOLT_POLYGON}
        fill="#ffffff"
        stroke="#ffffff"
        strokeWidth={BOLT_STROKE}
        strokeLinejoin="round"
      />
    </svg>
  );
};

interface WordmarkProps {
  className?: string;
  /** "lg" untuk onboarding, "sm" untuk header. */
  size?: 'sm' | 'md' | 'lg';
}

const WORDMARK_SIZES: Record<NonNullable<WordmarkProps['size']>, string> = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-2xl',
};

/** Wordmark saja, untuk dipakai di samping mark. */
export const KasKilatWordmark: React.FC<WordmarkProps> = ({ className = '', size = 'sm' }) => (
  <span
    className={`font-extrabold tracking-tight text-slate-900 dark:text-slate-100 ${WORDMARK_SIZES[size]} ${className}`}
  >
    Kas<span className="text-emerald-600 dark:text-emerald-400">Kilat</span>
  </span>
);
