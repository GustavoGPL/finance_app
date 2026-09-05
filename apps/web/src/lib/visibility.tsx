'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { VISIBILITIES, type Visibility } from '@finance/shared';

const STORAGE_KEY = 'finance.visibility';

interface VisibilityContextValue {
  visibility: Visibility;
  setVisibility: (v: Visibility) => void;
}

const VisibilityContext = createContext<VisibilityContextValue | null>(null);

export function VisibilityProvider({ children }: { children: ReactNode }) {
  const [visibility, setVisibilityState] = useState<Visibility>('SELF');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && (VISIBILITIES as readonly string[]).includes(stored)) {
      setVisibilityState(stored as Visibility);
    }
  }, []);

  const setVisibility = useCallback((v: Visibility) => {
    setVisibilityState(v);
    window.localStorage.setItem(STORAGE_KEY, v);
  }, []);

  return (
    <VisibilityContext.Provider value={{ visibility, setVisibility }}>
      {children}
    </VisibilityContext.Provider>
  );
}

export function useVisibility(): VisibilityContextValue {
  const ctx = useContext(VisibilityContext);
  if (!ctx) {
    throw new Error('useVisibility deve ser usado dentro de <VisibilityProvider>');
  }
  return ctx;
}
