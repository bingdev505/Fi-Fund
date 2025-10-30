'use client';
import { FinancialProvider } from '@/context/FinancialContext';
import AppShell from '@/components/AppShell';
import Passwords from '@/components/Passwords';

export default function PasswordsPage() {
  return (
    <FinancialProvider>
      <AppShell>
        <main className="flex-1">
          <Passwords />
        </main>
      </AppShell>
    </FinancialProvider>
  );
}
