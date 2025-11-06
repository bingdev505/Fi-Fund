'use client';
import { useFinancials } from '@/hooks/useFinancials';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowRight, PlusCircle, CheckCircle, HandCoins } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from './ui/button';
import Link from 'next/link';
import EntryList from './EntryList';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import EntryForm from './EntryForm';
import SummaryCard from './SummaryCard';
import { useAuth } from '@/context/AuthContext';

export default function Overview() {
  const { transactions, loans, currency, isLoading, bankAccounts } = useFinancials();
  const { user } = useAuth();
  const [entryFormOpen, setEntryFormOpen] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  }

  const {
    totalIncome,
    totalExpenses,
    primaryAccount,
    totalLoansGiven,
  } = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    
    let primaryAcc = bankAccounts.find(acc => acc.is_primary) || bankAccounts[0];

    const loansGiven = loans.filter(d => d.type === 'loanGiven' && d.status === 'active').reduce((sum, d) => sum + d.amount, 0);
    
    return {
      totalIncome: income,
      totalExpenses: expenses,
      primaryAccount: primaryAcc,
      totalLoansGiven: loansGiven,
    };
  }, [transactions, bankAccounts, loans]);
  
  if (isLoading) {
    // A more detailed skeleton can be built here if desired
    return <div>Loading...</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Dialog open={entryFormOpen} onOpenChange={setEntryFormOpen}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.email?.split('@')[0] || 'User'}!</h1>
            <p className="text-muted-foreground">Here's your full overview for {format(new Date(), 'MMMM d, yyyy')}.</p>
          </div>
          <div className="flex items-center gap-2">
            <DialogTrigger asChild>
                <Button onClick={() => setEntryFormOpen(true)}><PlusCircle className="mr-2" /> New Transaction</Button>
            </DialogTrigger>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard title="Total Income" value={formatCurrency(totalIncome)} icon="income" />
          <SummaryCard title="Total Expenses" value={formatCurrency(totalExpenses)} icon="expense" />
          <SummaryCard title="Loans Given" value={formatCurrency(totalLoansGiven)} icon="debtor" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Your latest financial movements.</CardDescription>
              </CardHeader>
              <CardContent>
                <EntryList limit={5} showHeader={false} />
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Primary Account</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{primaryAccount ? formatCurrency(primaryAccount.balance) : formatCurrency(0)}</p>
                <p className="text-xs text-muted-foreground">{primaryAccount?.name || 'No account set'}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Dialog Contents */}
        <DialogContent><DialogHeader><DialogTitle>Add New Transaction</DialogTitle></DialogHeader><EntryForm onFinished={() => setEntryFormOpen(false)} /></DialogContent>
      </Dialog>
    </div>
  );
}
