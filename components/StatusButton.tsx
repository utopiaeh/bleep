import type { ReactNode } from 'react';
import { useTranslation } from '../hooks/useTranslation';

export type ClearStatus = 'idle' | 'clearing' | 'done' | 'failed';

interface StatusButtonProps {
  status: ClearStatus;
  onClick: () => void;
  disabled?: boolean;
  idleLabel: ReactNode;
  clearingLabel?: ReactNode;
  doneLabel?: ReactNode;
  failedLabel?: ReactNode;
  variant?: 'primary' | 'secondary';
  size?: 'normal' | 'compact';
  className?: string;
}

const VARIANT_CLASSES: Record<NonNullable<StatusButtonProps['variant']>, string> = {
  primary: 'bg-blue-600 hover:bg-blue-500 text-white font-medium',
  secondary:
    'border border-stone-300 hover:bg-stone-100 dark:border-stone-600 dark:hover:bg-stone-700',
};

const SIZE_CLASSES: Record<NonNullable<StatusButtonProps['size']>, string> = {
  normal: 'w-full py-2 text-sm',
  compact: 'px-3 py-1.5 text-xs whitespace-nowrap',
};

export function StatusButton({
  status,
  onClick,
  disabled,
  idleLabel,
  clearingLabel,
  doneLabel,
  failedLabel,
  variant = 'primary',
  size = 'normal',
  className = '',
}: StatusButtonProps) {
  const t = useTranslation();
  clearingLabel ??= t('clearing');
  doneLabel ??= t('cleared');
  failedLabel ??= t('failed');
  const label =
    status === 'clearing'
      ? clearingLabel
      : status === 'done'
        ? doneLabel
        : status === 'failed'
          ? failedLabel
          : idleLabel;

  return (
    <button
      onClick={onClick}
      disabled={disabled || status === 'clearing'}
      className={`rounded-md cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 font-medium ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {label}
    </button>
  );
}
