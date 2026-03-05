import { createContext, useContext, ReactNode } from 'react';
import { useStore } from '@/hooks/useStore';
import { useAuth } from '@/contexts/AuthContext';

type StoreType = ReturnType<typeof useStore>;

const StoreContext = createContext<StoreType | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user, profile: authProfile } = useAuth();
  const store = useStore(user?.id ?? '');

  // Profile vem do AuthContext (Supabase) — sobrescreve o default do store
  const value: StoreType = {
    ...store,
    profile: authProfile ?? store.profile,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useAppStore(): StoreType {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useAppStore must be used within StoreProvider');
  return ctx;
}
