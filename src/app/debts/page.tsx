'use client';
import { FinancialProvider } from '@/context/FinancialContext';
import Debts from '@/components/Debts';
import AppShell from '@/components/AppShell';

export default function DebtsPage() {
  return (
    <FinancialProvider>
      <AppShell>
        <main className="flex-1">
          <Debts />
        </main>
      </AppShell>
    </FinancialProvider>
  );
}
