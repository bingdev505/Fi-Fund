'use client';
import { useUser } from '@/firebase';
import AIChat from '@/components/AIChat';
import AppShell from '@/components/AppShell';
import LoginPage from '@/components/LoginPage';
import { FinancialProvider } from '@/context/FinancialContext';

export default function Home() {
  const { user, isUserLoading } = useUser();

  if (isUserLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <FinancialProvider>
      <AppShell>
        <main className="flex flex-1 flex-col">
          <AIChat />
        </main>
      </AppShell>
    </FinancialProvider>
  );
}
