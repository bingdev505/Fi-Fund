'use client';

import { useFinancials } from '@/hooks/useFinancials';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, Landmark, Users, Wallet } from 'lucide-react';
import { useMemo } from 'react';

export default function Dashboard() {
  const { transactions, debts, currency, isLoading, bankAccounts } = useFinancials();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
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
    { title: 'Total Income', value: totalIncome, icon: TrendingUp, color: 'text-primary' },
    { title: 'Total Expenses', value: totalExpenses, icon: TrendingDown, color: 'text-destructive' },
    { title: 'Net Balance', value: netBalance, icon: DollarSign, color: netBalance >= 0 ? 'text-primary' : 'text-destructive' },
    { title: 'Total Bank Balance', value: totalBankBalance, icon: Wallet, color: 'text-primary' },
    { title: 'Money You Owe', value: totalCreditors, icon: Landmark, color: 'text-destructive' },
    { title: 'Money Owed to You', value: totalDebtors, icon: Users, color: 'text-primary' },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
                </CardHeader>
                <CardContent>
                    <div className="h-8 w-1/2 bg-muted rounded animate-pulse" />
                </CardContent>
            </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {summaryData.map(({ title, value, icon: Icon, color }) => (
        <Card key={title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className={`h-4 w-4 text-muted-foreground`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${color}`}>
              {formatCurrency(value)}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
