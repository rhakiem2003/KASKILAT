/**
 * @file EmptyState.tsx
 * @description Komponen kondisi kosong atau data tidak ditemukan dengan tombol aksi opsional.
 */

import React from 'react';
import { Button, ButtonProps } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionProps?: Partial<ButtonProps>;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionProps,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-10 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 ${className}`}
    >
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mb-3.5">
          {icon}
        </div>
      )}
      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
        {title}
      </h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction} {...actionProps}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
