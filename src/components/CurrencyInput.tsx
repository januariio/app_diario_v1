import { useCallback } from 'react';
import { cn } from '@/lib/utils';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
}

function formatBRL(cents: number): string {
  const reais = cents / 100;
  return reais.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function CurrencyInput({ value, onChange, placeholder, className }: CurrencyInputProps) {
  const cents = Math.round(value * 100);
  const display = formatBRL(cents);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace') {
        e.preventDefault();
        const next = Math.floor(cents / 10);
        onChange(next / 100);
        return;
      }
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        const next = cents * 10 + parseInt(e.key, 10);
        if (next <= 99_999_999_99) {
          onChange(next / 100);
        }
      }
    },
    [cents, onChange],
  );

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
        R$
      </span>
      <input
        type="text"
        inputMode="numeric"
        placeholder={placeholder ?? '0,00'}
        value={display}
        onKeyDown={handleKeyDown}
        onChange={() => {}}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          className,
        )}
      />
    </div>
  );
}
