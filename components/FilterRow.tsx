import type { ReactNode } from 'react';

interface FilterRowProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  children: ReactNode;
}

export function FilterRow({ value, onChange, placeholder, children }: FilterRowProps) {
  return (
    <div className="flex gap-2 mb-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 rounded-md border border-stone-300 bg-stone-50 dark:border-stone-600 dark:bg-stone-800 px-3 py-1.5 text-sm placeholder:text-stone-500 focus:outline-none focus:border-blue-500"
      />
      {children}
    </div>
  );
}
