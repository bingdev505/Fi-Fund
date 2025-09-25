'use client';
import { FinancialProvider } from '@/context/FinancialContext';
import Reports from '@/components/Reports';
import AppShell from '@/components/AppShell';

export default function ReportsPage() {
  return (
    <FinancialProvider>
      <AppShell>
        <main className="flex-1 p-4 md:p-6">
          <Reports />
        </main>
      </AppShell>
    </FinancialProvider>
  );
}
