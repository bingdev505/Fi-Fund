'use client';
import AIChat from '@/components/AIChat';
import AppShell from '@/components/AppShell';
import { FinancialProvider } from '@/context/FinancialContext';

export default function Home() {
  return (
    <FinancialProvider>
      <AppShell>
        <main className="flex flex-1 flex-col">
          <AIChat />
        </main>
      </AppShell>
    </FinancialProvider>
  );
}
