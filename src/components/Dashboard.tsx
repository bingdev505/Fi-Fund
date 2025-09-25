'use client';

import { useFinancials } from '@/hooks/useFinancials';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, Landmark, Users, Wallet } from 'lucide-react';
import { useMemo } from 'react';
import { Skeleton } from './ui/skeleton';

export default function Dashboard() {
  const { transactions, debts, currency, isLoading, bankAccounts } = useFinancials();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount);
  }

  const { totalIncome, totalExpenses, netBalance, totalCreditors, totalDebtors, totalBankBalance } = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const creditors = debts.filter(d => d.type === 'creditor').reduce((sum, d) => sum + d.amount, 0);
    const debtors = debts.filter(d => d.type === 'debtor').reduce((sum, d) => sum + d.amount, 0);
    const bankBalance = bankAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    return {
      totalIncome: income,
      totalExpenses: expenses,
      netBalance: income - expenses,
      totalCreditors: creditors,
      totalDebtors: debtors,
      totalBankBalance: bankBalance,
    };
  }, [transactions, debts, bankAccounts]);

  const summaryData = [
    { title: 'Total Income', value: totalIncome, icon: TrendingUp, color: 'text-green-600' },
    { title: 'Total Expenses', value: totalExpenses, icon: TrendingDown, color: 'text-red-600' },
    { title: 'Net Balance', value: netBalance, icon: DollarSign, color: netBalance >= 0 ? 'text-green-600' : 'text-red-600' },
    { title: 'Total Bank Balance', value: totalBankBalance, icon: Wallet, color: 'text-blue-600' },
    { title: 'You Owe (Creditors)', value: totalCreditors, icon: Landmark, color: 'text-red-600' },
    { title: 'Owed to You (Debtors)', value: totalDebtors, icon: Users, color: 'text-green-600' },
  ];

  if (isLoading) {
    return (
      <div className="p-4 md:p-8">
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
              <Card key={index} className="shadow-none border-border/60">
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-2/3" />
                  </CardHeader>
                  <CardContent>
                      <Skeleton className="h-8 w-1/2" />
                  </CardContent>
              </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {summaryData.map(({ title, value, icon: Icon, color }) => (
          <Card key={title} className="shadow-none border-border/60 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
              <div className="p-2 bg-muted rounded-full">
                <Icon className={`h-5 w-5 text-foreground`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${color}`}>
                {formatCurrency(value)}
              </div>
            </CardContent>
          </Card>
        ))}
        {bankAccounts.map(account => (
          <Card key={account.id} className="shadow-none border-border/60 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{account.name}</CardTitle>
                  <div className="p-2 bg-muted rounded-full">
                    <Wallet className="h-5 w-5 text-foreground" />
                  </div>
              </CardHeader>
              <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                      {formatCurrency(account.balance)}
                  </div>
              </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
