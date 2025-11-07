'use client';
import { FinancialProvider } from '@/context/FinancialContext';
import AIChat from '@/components/AIChat';
import AppShell from '@/components/AppShell';

export default function AIChatPage() {
  return (
    <FinancialProvider>
      <AppShell>
        <AIChat />
      </AppShell>
    </FinancialProvider>
  );
}
