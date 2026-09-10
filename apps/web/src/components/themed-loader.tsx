'use client';

import { cn } from '@/lib/utils';

function GoingMerry({ width }: { width: number }) {
  return (
    <span
      className="op-ship inline-block bg-contain bg-center bg-no-repeat"
      style={{ width, height: width * 1.066, backgroundImage: 'url(/loaders/going-merry.png)' }}
      aria-hidden
    />
  );
}

export function ThemedLoader({ className, size = 64 }: { className?: string; size?: number }) {
  return (
    <span
      className={cn('inline-flex items-center justify-center', className)}
      role="status"
      aria-label="Carregando"
    >
      <GoingMerry width={size} />
    </span>
  );
}
