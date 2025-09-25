'use client';
import { FinancialProvider } from '@/context/FinancialContext';
import Dashboard from '@/components/Dashboard';
import AppShell from '@/components/AppShell';

export default function DashboardPage() {
  return (
    <FinancialProvider>
      <AppShell>
        <Dashboard />
      </AppShell>
    </FinancialProvider>
  );
}
