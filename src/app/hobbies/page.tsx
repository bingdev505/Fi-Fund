'use client';
import { FinancialProvider } from '@/context/FinancialContext';
import Hobbies from '@/components/Hobbies';
import AppShell from '@/components/AppShell';

export default function HobbiesPage() {
  return (
    <FinancialProvider>
      <AppShell>
        <main className="flex-1">
          <Hobbies />
        </main>
      </AppShell>
    </FinancialProvider>
  );
}
