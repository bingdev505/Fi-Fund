'use client';

import { useFinancials } from '@/hooks/useFinancials';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, Landmark, Users } from 'lucide-react';
import { useMemo } from 'react';

export default function Dashboard() {
  const { transactions, debts } = useFinancials();

  const { totalIncome, totalExpenses, netBalance, totalCreditors, totalDebtors } = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const creditors = debts.filter(d => d.type === 'creditor').reduce((sum, d) => sum + d.amount, 0);
    const debtors = debts.filter(d => d.type === 'debtor').reduce((sum, d) => sum + d.amount, 0);
    return {
      totalIncome: income,
      totalExpenses: expenses,
      netBalance: income - expenses,
      totalCreditors: creditors,
      totalDebtors: debtors,
    };
  }, [transactions, debts]);

  const summaryData = [
    { title: 'Total Income', value: totalIncome, icon: TrendingUp, color: 'text-primary' },
    { title: 'Total Expenses', value: totalExpenses, icon: TrendingDown, color: 'text-destructive' },
    { title: 'Net Balance', value: netBalance, icon: DollarSign, color: netBalance >= 0 ? 'text-primary' : 'text-destructive' },
    { title: 'Money You Owe', value: totalCreditors, icon: Landmark, color: 'text-destructive' },
    { title: 'Money Owed to You', value: totalDebtors, icon: Users, color: 'text-primary' },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {summaryData.map(({ title, value, icon: Icon, color }) => (
        <Card key={title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className={`h-4 w-4 text-muted-foreground`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${color}`}>
              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value)}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
