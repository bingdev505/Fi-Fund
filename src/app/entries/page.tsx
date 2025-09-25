'use client';
import { FinancialProvider } from '@/context/FinancialContext';
import Entries from '@/components/Entries';
import AppShell from '@/components/AppShell';

export default function EntriesPage() {
  return (
    <FinancialProvider>
      <AppShell>
        <main className="flex flex-1 flex-col">
          <Entries />
        </main>
      </AppShell>
    </FinancialProvider>
  );
}
