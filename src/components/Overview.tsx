'use client';

import { useFinancials } from '@/hooks/useFinancials';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, Wallet, ArrowRight, BookUser, BarChart3, Bot, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import { Skeleton } from './ui/skeleton';
import { format } from 'date-fns';
import { Button } from './ui/button';
import Link from 'next/link';
import EntryList from './EntryList';
import { useUser } from '@/firebase';

export default function Overview() {
  const { transactions, debts, currency, isLoading, bankAccounts } = useFinancials();
  const { user } = useUser();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount);
  }

  const { totalIncome, totalExpenses, netBalance, primaryAccount } = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    
    let primaryAcc = bankAccounts.find(acc => acc.isPrimary);
    if (!primaryAcc && bankAccounts.length > 0) {
        primaryAcc = bankAccounts[0];
    }

    return {
      totalIncome: income,
      totalExpenses: expenses,
      netBalance: income - expenses,
      primaryAccount: primaryAcc,
    };
  }, [transactions, bankAccounts]);

  const summaryData = [
    { title: 'Total Income', value: totalIncome, icon: TrendingUp, color: 'text-green-600' },
    { title: 'Total Expenses', value: totalExpenses, icon: TrendingDown, color: 'text-red-600' },
    { title: 'Net Balance', value: netBalance, icon: DollarSign, color: netBalance >= 0 ? 'text-green-600' : 'text-red-600' },
  ];

  const today = new Date();

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 space-y-6">
        <Skeleton className="h-16 w-1/2 mb-4" />
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48 w-full" />
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-32 w-full" />)}
            </div>
          </div>
          <div className="lg:col-span-1 space-y-6">
            <Skeleton className="h-80 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
            <div className="flex items-center gap-4">
                <div className="flex flex-col items-center justify-center h-16 w-16 rounded-full bg-card border">
                    <span className="text-2xl font-bold text-primary">{format(today, 'dd')}</span>
                </div>
                <div>
                    <p className="font-semibold text-xl text-foreground">{format(today, 'EEEE')}</p>
                    <p className="text-muted-foreground">{format(today, 'MMMM yyyy')}</p>
                </div>
            </div>
            <div className='mt-4 sm:mt-0 text-left sm:text-right'>
                <h2 className='text-2xl md:text-3xl font-bold text-foreground'>Hey, {user?.email?.split('@')[0] || 'User'}! 👋</h2>
                <Link href="/ai-chat" className='text-muted-foreground hover:text-primary transition-colors'>
                    Need help? Just ask me anything!
                </Link>
            </div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
            {/* Primary Account Card */}
            {primaryAccount && (
                 <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader>
                        <CardTitle className='flex items-center justify-between'>
                            <span>Primary Account</span>
                            <span className="text-sm font-normal bg-primary/10 text-primary px-2 py-1 rounded-md">{primaryAccount.name}</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Current Balance</p>
                            <p className="text-4xl font-bold text-foreground">{formatCurrency(primaryAccount.balance)}</p>
                        </div>
                        <Link href="/entries" className='w-full sm:w-auto'>
                           <Button className='w-full'>
                                Add Transaction <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {summaryData.map(({ title, value, icon: Icon, color }) => (
                <Card key={title} className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                    <div className="p-2 bg-muted rounded-full">
                        <Icon className={`h-5 w-5 text-foreground`} />
                    </div>
                    </CardHeader>
                    <CardContent>
                    <div className={`text-2xl font-bold ${color}`}>
                        {formatCurrency(value)}
                    </div>
                    </CardContent>
                </Card>
                ))}
            </div>

             {/* Link Cards */}
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className='p-6 flex items-center justify-between'>
                        <div className='flex items-center gap-4'>
                            <div className='p-3 bg-muted rounded-lg'>
                                <BarChart3 className='h-6 w-6 text-primary' />
                            </div>
                            <div>
                                <h3 className='font-semibold'>Reports</h3>
                                <p className='text-sm text-muted-foreground'>View detailed reports</p>
                            </div>
                        </div>
                        <Link href="/reports">
                            <Button variant="ghost" size="icon"><ChevronRight /></Button>
                        </Link>
                    </CardContent>
                </Card>
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className='p-6 flex items-center justify-between'>
                        <div className='flex items-center gap-4'>
                            <div className='p-3 bg-muted rounded-lg'>
                                <Bot className='h-6 w-6 text-primary' />
                            </div>
                            <div>
                                <h3 className='font-semibold'>AI Assistant</h3>
                                <p className='text-sm text-muted-foreground'>Chat with AI</p>
                            </div>
                        </div>
                        <Link href="/ai-chat">
                            <Button variant="ghost" size="icon"><ChevronRight /></Button>
                        </Link>
                    </CardContent>
                </Card>
             </div>


        </div>

        {/* Right Sidebar Area */}
        <div className="lg:col-span-1">
             <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                    <CardTitle>Activity Manager</CardTitle>
                </CardHeader>
                <CardContent>
                    <EntryList limit={5} showHeader={false} />
                </CardContent>
            </Card>
        </div>

      </div>
    </div>
  );
}
