'use client';

import { VISIBILITIES } from '@finance/shared';
import { useVisibility } from '@/lib/visibility';
import { VISIBILITY_LABEL } from '@/lib/types';
import { cn } from '@/lib/utils';

export function VisibilitySwitch({ className }: { className?: string }) {
  const { visibility, setVisibility } = useVisibility();

  return (
    <div className={cn('flex rounded-md border bg-muted/40 p-0.5', className)}>
      {VISIBILITIES.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => setVisibility(v)}
          title={VISIBILITY_LABEL[v]}
          className={cn(
            'rounded px-3 py-1 text-xs font-medium transition-colors',
            visibility === v
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {VISIBILITY_LABEL[v]}
        </button>
      ))}
    </div>
  );
}
