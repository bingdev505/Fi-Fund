'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import FinancialChart from './FinancialChart';
import { useFinancials } from '@/hooks/useFinancials';
import { generateFinancialInsights } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Lightbulb, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import DebtList from './DebtList';

type ReportPeriod = 'weekly' | 'monthly' | 'annual';

export default function Reports() {
  const { transactions, debts, currency } = useFinancials();
  const [insight, setInsight] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [period, setPeriod] = useState<ReportPeriod>('annual');

  const { totalDebtors, totalCreditors } = useMemo(() => {
    return {
      totalDebtors: debts.filter(d => d.type === 'debtor' && d.amount > 0).reduce((sum, d) => sum + d.amount, 0),
      totalCreditors: debts.filter(d => d.type === 'creditor' && d.amount > 0).reduce((sum, d) => sum + d.amount, 0),
    };
  }, [debts]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
  }

  const handleGenerateInsights = async () => {
    setIsLoading(true);
    setInsight(null);
    const financialData = `
      Income: ${JSON.stringify(transactions.filter(t => t.type === 'income'))}
      Expenses: ${JSON.stringify(transactions.filter(t => t.type === 'expense'))}
      Creditors (You Owe): ${JSON.stringify(debts.filter(d => d.type === 'creditor'))}
      Debtors (Owed to You): ${JSON.stringify(debts.filter(d => d.type === 'debtor'))}
    `;
    
    try {
      const result = await generateFinancialInsights({ financialData });
      setInsight(result.insight);
    } catch (error) {
      console.error(error);
      setInsight("Failed to generate insights. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const debtSummary = [
    { title: 'Total Owed to You', value: totalDebtors, icon: TrendingUp, color: 'text-green-600' },
    { title: 'Total You Owe', value: totalCreditors, icon: TrendingDown, color: 'text-red-600' },
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
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <CardTitle>Financial Report</CardTitle>
              <CardDescription>Income vs. Expenses over time.</CardDescription>
            </div>
            <Select value={period} onValueChange={(value: ReportPeriod) => setPeriod(value)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">This Week</SelectItem>
                <SelectItem value="monthly">This Month</SelectItem>
                <SelectItem value="annual">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <FinancialChart transactions={transactions} period={period} />
        </CardContent>
      </Card>
      
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

      <Card>
        <CardHeader>
          <CardTitle>AI-Powered Insights</CardTitle>
          <CardDescription>Get a summary and insights into your financial situation from our AI assistant.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleGenerateInsights} disabled={isLoading || transactions.length === 0}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
            Generate AI Insights
          </Button>
          {transactions.length === 0 && <p className="text-sm text-muted-foreground mt-2">Add some transactions to generate insights.</p>}
          {isLoading && <p className="mt-4 text-muted-foreground">Analyzing your data...</p>}
          {insight && (
            <Alert className="mt-4 border-primary/20 bg-primary/5 text-primary">
              <Lightbulb className="h-4 w-4 text-primary" />
              <AlertTitle className="font-headline text-primary">Your Financial Insight</AlertTitle>
              <AlertDescription className="text-primary/90">
                {insight}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
