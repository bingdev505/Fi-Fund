'use client';
import { FinancialProvider } from '@/context/FinancialContext';
import AppShell from '@/components/AppShell';
import Planner from '@/components/Planner';

export default function HobbiesPage() {
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
