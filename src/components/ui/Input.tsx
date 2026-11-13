/**
 * @file Input.tsx
 * @description Komponen input teks numerik/string dengan label dan validasi error.
 */

import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  leftPrefix?: React.ReactNode;
  rightSuffix?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  helperText,
  errorMessage,
  leftPrefix,
  rightSuffix,
  id,
  className = '',
  disabled,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {leftPrefix && (
          <div className="absolute left-3.5 pointer-events-none text-slate-400 dark:text-slate-500 flex items-center text-sm">
            {leftPrefix}
          </div>
        )}

        <input
          id={inputId}
          disabled={disabled}
          className={`w-full h-11 rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm transition-colors
            ${leftPrefix ? 'pl-11' : 'pl-3.5'}
            ${rightSuffix ? 'pr-11' : 'pr-3.5'}
            ${
              errorMessage
                ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                : 'border-slate-300 dark:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
            }
            disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed
            placeholder:text-slate-400 dark:placeholder:text-slate-500 ${className}`}
          {...props}
        />

        {rightSuffix && (
          <div className="absolute right-3.5 text-slate-400 dark:text-slate-500 flex items-center text-sm">
            {rightSuffix}
          </div>
        )}
      </div>

      {errorMessage ? (
        <p className="text-xs text-rose-500">{errorMessage}</p>
      ) : helperText ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">{helperText}</p>
      ) : null}
    </div>
  );
};
