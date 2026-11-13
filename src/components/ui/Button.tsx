/**
 * @file Button.tsx
 * @description Komponen tombol generik dengan touch target minimal 44px dan state loading.
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all duration-150 select-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

  const sizeStyles = {
    sm: 'text-xs h-9 px-3 gap-1.5 rounded-lg min-h-[36px]',
    md: 'text-sm h-11 px-4 gap-2 rounded-xl min-h-[44px]',
    lg: 'text-base h-12 px-6 gap-2.5 rounded-xl min-h-[48px]',
  };

  const variantStyles = {
    primary:
      'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 focus-visible:ring-emerald-500',
    secondary:
      'bg-slate-900 text-white hover:bg-slate-800 shadow-sm focus-visible:ring-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white',
    danger:
      'bg-rose-600 text-white hover:bg-rose-700 shadow-sm shadow-rose-600/20 focus-visible:ring-rose-500',
    outline:
      'border border-slate-300 dark:border-slate-700 bg-transparent text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 focus-visible:ring-slate-400',
    ghost:
      'bg-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:ring-slate-400',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span className="truncate">{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
