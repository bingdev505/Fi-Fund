'use client';
import { FinancialProvider } from '@/context/FinancialContext';
import AppShell from '@/components/AppShell';
import ContactsView from '@/components/ContactsView';

export default function ContactsPage() {
  return (
    <FinancialProvider>
      <AppShell>
        <ContactsView />
      </AppShell>
    </FinancialProvider>
  );
}
