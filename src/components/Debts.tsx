'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import DebtList from './DebtList';
import { useMemo } from 'react';
import { useFinancials } from '@/hooks/useFinancials';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function Debts() {
  const { debts, currency } = useFinancials();

  const { totalDebtors, totalCreditors } = useMemo(() => {
    return {
      totalDebtors: debts.filter(d => d.type === 'debtor' && d.amount > 0).reduce((sum, d) => sum + d.amount, 0),
      totalCreditors: debts.filter(d => d.type === 'creditor' && d.amount > 0).reduce((sum, d) => sum + d.amount, 0),
    };
  }, [debts]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
  }

  const debtSummary = [
    { title: 'Total Owed to You (Debtors)', value: totalDebtors, icon: TrendingDown, color: 'text-red-600' },
    { title: 'Total You Owe (Creditors)', value: totalCreditors, icon: TrendingUp, color: 'text-green-600' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {debtSummary.map(({ title, value, icon: Icon, color }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${color}`}>{formatCurrency(value)}</div>
            </CardContent>
          </Card>
        ))}
      </div>
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
            <CardHeader>
                <CardTitle>Debtors (Owed to You)</CardTitle>
                <CardDescription>List of individuals or entities that owe you money.</CardDescription>
            </CardHeader>
            <CardContent>
                <DebtList type="debtor" />
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Creditors (You Owe)</CardTitle>
                <CardDescription>List of individuals or entities you owe money to.</CardDescription>
            </CardHeader>
            <CardContent>
                <DebtList type="creditor" />
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
