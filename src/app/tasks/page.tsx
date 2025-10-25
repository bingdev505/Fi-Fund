'use client';
import { FinancialProvider } from '@/context/FinancialContext';
import Tasks from '@/components/Tasks';
import AppShell from '@/components/AppShell';

export default function TasksPage() {
  return (
    <FinancialProvider>
      <AppShell>
        <main className="flex-1">
          <Tasks />
        </main>
      </AppShell>
    </FinancialProvider>
  );
}
