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
  className?: string;
}

const VARIANT_CLASSES: Record<NonNullable<StatusButtonProps['variant']>, string> = {
  primary: 'bg-blue-600 hover:bg-blue-500 text-white font-medium',
  secondary: 'border border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800',
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
  className = '',
}: StatusButtonProps) {
  const t = useTranslation();
  clearingLabel ??= t('clearing');
  doneLabel ??= t('cleared');
  failedLabel ??= t('failed');
  const label =
    status === 'clearing' ? clearingLabel : status === 'done' ? doneLabel : status === 'failed' ? failedLabel : idleLabel;

  return (
    <button
      onClick={onClick}
      disabled={disabled || status === 'clearing'}
      className={`w-full rounded-md cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 py-2 text-sm font-medium ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {label}
    </button>
  );
}
