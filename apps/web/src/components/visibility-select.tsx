'use client';

import { VISIBILITIES, type Visibility } from '@finance/shared';
import { useVisibility } from '@/lib/visibility';
import { VISIBILITY_LABEL } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export function VisibilitySelect({ className }: { className?: string }) {
  const { visibility, setVisibility } = useVisibility();

  return (
    <Select
      value={visibility}
      onValueChange={(v) => setVisibility(v as Visibility)}
    >
      <SelectTrigger
        aria-label="Filtrar visibilidade"
        className={cn('h-8 gap-1 rounded-md border-0 bg-muted/60 px-2.5 text-xs font-medium', className)}
      >
        <SelectValue placeholder="Visibilidade" />
      </SelectTrigger>
      <SelectContent align="end">
        {VISIBILITIES.map((v) => (
          <SelectItem key={v} value={v}>
            {VISIBILITY_LABEL[v]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
