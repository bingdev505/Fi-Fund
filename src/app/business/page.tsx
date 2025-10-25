'use client';
import { FinancialProvider } from '@/context/FinancialContext';
import BusinessShell from '@/components/BusinessShell';

export default function BusinessPage({ children }: { children: React.ReactNode }) {
  return (
    <FinancialProvider>
      <BusinessShell>
        {children}
      </BusinessShell>
    </FinancialProvider>
  );
}
