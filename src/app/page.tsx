'use client';

import { Bot, BarChart2, LayoutDashboard, ArrowRightLeft, Users } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FinancialProvider } from '@/context/FinancialContext';

import Dashboard from '@/components/Dashboard';
import Transactions from '@/components/Transactions';
import Debts from '@/components/Debts';
import Reports from '@/components/Reports';
import AIChat from '@/components/AIChat';

export default function Home() {
  return (
    <FinancialProvider>
      <div className="flex min-h-screen w-full flex-col bg-background">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
          <h1 className="text-2xl font-headline font-bold text-primary">FinanceFlow AI</h1>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
              <TabsTrigger value="dashboard"><LayoutDashboard className="mr-2 h-4 w-4" />Dashboard</TabsTrigger>
              <TabsTrigger value="transactions"><ArrowRightLeft className="mr-2 h-4 w-4" />Transactions</TabsTrigger>
              <TabsTrigger value="debts"><Users className="mr-2 h-4 w-4" />Debts</TabsTrigger>
              <TabsTrigger value="reports"><BarChart2 className="mr-2 h-4 w-4" />Reports</TabsTrigger>
              <TabsTrigger value="ai-chat"><Bot className="mr-2 h-4 w-4" />AI Chat</TabsTrigger>
            </TabsList>
            <TabsContent value="dashboard">
              <Dashboard />
            </TabsContent>
            <TabsContent value="transactions">
              <Transactions />
            </TabsContent>
            <TabsContent value="debts">
              <Debts />
            </TabsContent>
            <TabsContent value="reports">
              <Reports />
            </TabsContent>
            <TabsContent value="ai-chat">
              <AIChat />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </FinancialProvider>
  );
}
