'use client';
import { FinancialProvider } from '@/context/FinancialContext';
import Settings from '@/components/Settings';
import AppShell from '@/components/AppShell';

export default function SettingsPage() {
  return (
    <FinancialProvider>
      <AppShell>
        <main className="flex flex-1 flex-col overflow-y-auto">
          <Settings />
        </main>
      </AppShell>
    </FinancialProvider>
  );
}
