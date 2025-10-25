'use client';
import { FinancialProvider } from '@/context/FinancialContext';
import Overview from '@/components/Overview';
import AppShell from '@/components/AppShell';

export default function OverviewPage() {
  return (
    <FinancialProvider>
      <AppShell>
        <main className="flex flex-1 flex-col">
          <Overview />
        </main>
      </AppShell>
    </FinancialProvider>
  );
}
