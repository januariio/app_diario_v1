import { ReactNode } from 'react';
import BottomNav from './BottomNav';

export default function MobileLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background">
      <main className="flex-1 overflow-y-auto px-4 pb-24 pt-6">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
