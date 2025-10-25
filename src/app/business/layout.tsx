'use client';
import { FinancialProvider } from '@/context/FinancialContext';

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FinancialProvider>
        {children}
    </FinancialProvider>
  );
}
