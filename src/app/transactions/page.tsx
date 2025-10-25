'use client';
import { FinancialProvider } from '@/context/FinancialContext';
import Transactions from '@/components/Transactions';
import AppShell from '@/components/AppShell';

export default function TransactionsPage() {
  return (
    <FinancialProvider>
      <AppShell>
        <main className="flex flex-1 flex-col">
          <Transactions />
        </main>
      </AppShell>
    </FinancialProvider>
  );
}
