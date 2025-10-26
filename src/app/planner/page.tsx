'use client';
import { FinancialProvider } from '@/context/FinancialContext';
import Planner from '@/components/Planner';
import AppShell from '@/components/AppShell';

export default function PlannerPage() {
  return (
    <FinancialProvider>
      <AppShell>
        <main className="flex-1">
          <Planner />
        </main>
      </AppShell>
    </FinancialProvider>
  );
}
