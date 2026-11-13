/**
 * @file Card.tsx
 * @description Komponen kontainer Card dengan batas hairline halus tanpa nested border ganda.
 */

import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  asHoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  padding = 'md',
  asHoverable = false,
  className = '',
  ...props
}) => {
  const paddingStyles = {
    none: 'p-0',
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-5',
    lg: 'p-5 sm:p-6',
  };

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm/50 ${
        paddingStyles[padding]
      } ${
        asHoverable
          ? 'hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer'
          : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
