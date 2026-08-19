import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { StatusButton, type ClearStatus } from './StatusButton';

interface DangerConfirmButtonProps {
  status: ClearStatus;
  idleLabel: string;
  confirmLabel: string;
  onConfirm: () => void;
  disabled?: boolean;
  autoCancelMs?: number;
  size?: 'normal' | 'compact';
}

export function DangerConfirmButton({
  status,
  idleLabel,
  confirmLabel,
  onConfirm,
  disabled,
  autoCancelMs = 4000,
  size = 'normal',
}: DangerConfirmButtonProps) {
  const t = useTranslation();
  const [armed, setArmed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  function arm() {
    setArmed(true);
    timerRef.current = setTimeout(() => setArmed(false), autoCancelMs);
  }

  function cancel() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setArmed(false);
  }

  function confirm() {
    cancel();
    onConfirm();
  }

  const armedPadding = size === 'compact' ? 'px-3 py-1.5 text-xs' : 'px-3 py-2 text-sm';

  if (armed) {
    return (
      <div className="flex gap-2">
        <button
          onClick={confirm}
          className={`flex-1 rounded-md cursor-pointer bg-red-600 hover:bg-red-500 text-white font-medium whitespace-nowrap ${armedPadding}`}
        >
          {confirmLabel}
        </button>
        <button
          onClick={cancel}
          className={`rounded-md cursor-pointer border border-stone-300 hover:bg-stone-100 dark:border-stone-600 dark:hover:bg-stone-700 whitespace-nowrap ${armedPadding}`}
        >
          {t('cancel')}
        </button>
      </div>
    );
  }

  return (
    <StatusButton
      status={status}
      onClick={arm}
      disabled={disabled}
      variant="secondary"
      size={size}
      idleLabel={idleLabel}
    />
  );
}
