'use client';
import AppShell from '@/components/AppShell';
import ContactsView from '@/components/ContactsView';
import { FinancialProvider } from '@/context/FinancialContext';

export default function ContactsPage() {
  return (
    <FinancialProvider>
      <AppShell>
        <ContactsView />
      </AppShell>
    </FinancialProvider>
  );
}
