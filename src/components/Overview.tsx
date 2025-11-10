
'use client';
import { useFinancials } from '@/hooks/useFinancials';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowRight, PlusCircle, CheckCircle, HandCoins, Landmark } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from './ui/button';
import Link from 'next/link';
import EntryList from './EntryList';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import EntryForm from './EntryForm';
import SummaryCard from './SummaryCard';
import { useAuth } from '@/context/AuthContext';
import { Separator } from './ui/separator';

export default function Overview() {
  const { transactions, loans, currency, bankAccounts } = useFinancials();
  const { user } = useAuth();
  const [entryFormOpen, setEntryFormOpen] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  }

  const {
    totalIncome,
    totalExpenses,
    totalLoansGiven,
    totalLoansTaken,
  } = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    
    const loansGiven = loans.filter(d => d.type === 'loanGiven' && d.status === 'active').reduce((sum, d) => sum + d.amount, 0);
    const loansTaken = loans.filter(d => d.type === 'loanTaken' && d.status === 'active').reduce((sum, d) => sum + d.amount, 0);
    
    return {
      totalIncome: income,
      totalExpenses: expenses,
      totalLoansGiven: loansGiven,
      totalLoansTaken: loansTaken,
    };
  }, [transactions, loans]);
  

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
          <SummaryCard title="Loans Taken" value={formatCurrency(totalLoansTaken)} icon="creditor" />
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
                <EntryList limit={5} showHeader={false} showControls={false} />
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
             <Card>
              <CardHeader>
                <CardTitle>Account Balances</CardTitle>
                <CardDescription>All account balances for this business.</CardDescription>
              </CardHeader>
              <CardContent>
                {bankAccounts.length > 0 ? (
                  <ul className="space-y-4">
                    {bankAccounts.map((account, index) => (
                      <li key={account.id}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Landmark className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <p className="font-medium">{account.name}</p>
                                    <p className="text-xs text-muted-foreground">{account.is_primary && "Primary"}</p>
                                </div>
                            </div>
                            <p className="font-semibold">{formatCurrency(account.balance)}</p>
                        </div>
                        {index < bankAccounts.length - 1 && <Separator className="mt-4" />}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No bank accounts for this business.</p>
                )}
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
