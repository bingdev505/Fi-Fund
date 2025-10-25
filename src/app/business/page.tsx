'use client';
import { FinancialProvider } from '@/context/FinancialContext';
import Business from '@/components/Business';
import AppShell from '@/components/AppShell';

export default function BusinessPage() {
  return (
    <FinancialProvider>
      <AppShell>
        <main className="flex flex-1 flex-col">
          <Business />
        </main>
      </AppShell>
    </FinancialProvider>
  );
}
