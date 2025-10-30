'use client';
import { FinancialProvider } from '@/context/FinancialContext';
import AppShell from '@/components/AppShell';
import TaskTracker from '@/components/TaskTracker';

export default function TasksPage() {
  return (
    <FinancialProvider>
      <AppShell>
        <main className="flex-1">
          <TaskTracker />
        </main>
      </AppShell>
    </FinancialProvider>
  );
}
