'use client';
import { FinancialProvider } from '@/context/FinancialContext';
import Dashboard from '@/components/Dashboard';
import AppShell from '@/components/AppShell';

export default function DashboardPage() {
  return (
    <FinancialProvider>
      <AppShell>
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 overflow-y-auto">
          <Dashboard />
        </main>
      </AppShell>
    </FinancialProvider>
  );
}
