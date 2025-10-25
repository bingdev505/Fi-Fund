'use client';
import AppShell from '@/components/AppShell';
import BusinessShell from '@/components/BusinessShell';
import { FinancialProvider } from '@/context/FinancialContext';

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FinancialProvider>
      <AppShell>
        <BusinessShell>{children}</BusinessShell>
      </AppShell>
    </FinancialProvider>
  );
}
