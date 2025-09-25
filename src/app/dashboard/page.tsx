'use client';
import { FinancialProvider } from '@/context/FinancialContext';
import Dashboard from '@/components/Dashboard';
import AppShell from '@/components/AppShell';

export default function DashboardPage() {
  return (
    <FinancialProvider>
      <AppShell>
        <main className="flex flex-1 flex-col">
          <Dashboard />
        </main>
      </AppShell>
    </FinancialProvider>
  );
}
