
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import FinancialChart from './FinancialChart';
import { useFinancials } from '@/hooks/useFinancials';
import { generateFinancialInsights } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Lightbulb, Loader2, ArrowUp, ArrowDown, ArrowRightLeft, Handshake } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { subDays, format, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Transaction } from '@/lib/types';


type ReportPeriod = 'weekly' | 'monthly' | 'annual';

export default function Reports() {
  const { allTransactions, loans, projects, categories, bankAccounts } = useFinancials();
  const [insight, setInsight] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [period, setPeriod] = useState<ReportPeriod>('annual');
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(projects[0]?.id);

  // State for advanced filtering
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);


  const handleGenerateInsights = async () => {
    setIsLoading(true);
    setInsight(null);
    const financialData = `
      Income: ${JSON.stringify(chartTransactions.filter(t => t.type === 'income'))}
      Expenses: ${JSON.stringify(chartTransactions.filter(t => t.type === 'expense'))}
      Loans Given: ${JSON.stringify(loans.filter(d => d.type === 'loanGiven'))}
      Loans Taken: ${JSON.stringify(loans.filter(d => d.type === 'loanTaken'))}
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
  
  const chartTransactions = useMemo(() => {
    if (!selectedProjectId) {
      return allTransactions;
    }
    return allTransactions.filter(t => t.project_id === selectedProjectId);
  }, [allTransactions, selectedProjectId]);

  const { filteredData, totalIncome, totalExpenses } = useMemo(() => {
    let data = chartTransactions;

    if (dateRange?.from) {
      const toDate = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
      data = data.filter(t => {
        const tDate = new Date(t.date);
        return tDate >= dateRange.from! && tDate <= toDate;
      });
    }

    if (typeFilter !== 'all') {
      data = data.filter(t => t.type === typeFilter);
    }

    if (categoryFilter !== 'all') {
      data = data.filter(t => t.category === categoryFilter);
    }

    const income = data.filter(t => t.type === 'income' || (t.type === 'repayment' && loans.find(l => l.id === t.loan_id)?.type === 'loanGiven')).reduce((sum, t) => sum + t.amount, 0);
    const expenses = data.filter(t => t.type === 'expense' || t.type === 'transfer' || (t.type === 'repayment' && loans.find(l => l.id === t.loan_id)?.type === 'loanTaken')).reduce((sum, t) => sum + t.amount, 0);

    return { filteredData: data, totalIncome: income, totalExpenses: expenses };
  }, [chartTransactions, dateRange, typeFilter, categoryFilter, loans]);

  const uniqueCategories = useMemo(() => {
    const cats = chartTransactions.map(t => t.category);
    return [...new Set(cats)];
  }, [chartTransactions]);
  
  const formatCurrency = (amount: number) => {
    const currency = 'INR'; // Assuming currency from context if available
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
  };

  const getAccountName = (id?: string) => bankAccounts.find(a => a.id === id)?.name || 'N/A';
  
  const TypeIcon = ({ type }: { type: Transaction['type']}) => {
    switch (type) {
      case 'income': return <ArrowUp className="h-4 w-4 text-green-500" />;
      case 'expense': return <ArrowDown className="h-4 w-4 text-red-500" />;
      case 'transfer': return <ArrowRightLeft className="h-4 w-4 text-blue-500" />;
      case 'repayment': return <Handshake className="h-4 w-4 text-yellow-500" />;
      default: return null;
    }
  };


  return (
    <div className="p-4 md:p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <CardTitle>Financial Report</CardTitle>
              <CardDescription>Income vs. Expenses over time.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <Select value={selectedProjectId} onValueChange={(value) => setSelectedProjectId(value)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Select Business" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          </div>
        </CardHeader>
        <CardContent>
          <FinancialChart transactions={chartTransactions} period={period} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI-Powered Insights</CardTitle>
          <CardDescription>Get a summary and insights into your financial situation from our AI assistant.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleGenerateInsights} disabled={isLoading || chartTransactions.length === 0}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
            Generate AI Insights
          </Button>
          {chartTransactions.length === 0 && <p className="text-sm text-muted-foreground mt-2">Add some transactions to generate insights.</p>}
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

      <Card>
        <CardHeader>
            <CardTitle>Data Explorer</CardTitle>
            <CardDescription>An advanced, filterable view of your transactions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border rounded-lg">
             <DateRangePicker date={dateRange} onDateChange={setDateRange} className="w-full" />
             <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger><SelectValue placeholder="Filter by type..." /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="repayment">Repayment</SelectItem>
                </SelectContent>
             </Select>
             <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger><SelectValue placeholder="Filter by category..." /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {uniqueCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
             </Select>
          </div>

          <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredData.length > 0 ? filteredData.map(t => (
                         <TableRow key={t.id}>
                            <TableCell>{format(new Date(t.date), 'dd/MM/yy')}</TableCell>
                            <TableCell>
                                {t.type === 'transfer' 
                                 ? `${getAccountName(t.from_account_id)} -> ${getAccountName(t.to_account_id)}`
                                 : getAccountName(t.account_id)}
                            </TableCell>
                            <TableCell>
                                <div className='flex items-center gap-2'>
                                    <TypeIcon type={t.type} />
                                    <span className="capitalize">{t.type}</span>
                                </div>
                            </TableCell>
                            <TableCell className="font-medium">{t.description}</TableCell>
                            <TableCell>{t.category}</TableCell>
                            <TableCell className={cn("text-right font-semibold", 
                                t.type === 'income' || (t.type === 'repayment' && loans.find(l => l.id === t.loan_id)?.type === 'loanGiven') ? 'text-green-600' : 
                                (t.type === 'expense' || t.type === 'transfer' || (t.type === 'repayment' && loans.find(l => l.id === t.loan_id)?.type === 'loanTaken')) ? 'text-red-600' : ''
                            )}>
                                {formatCurrency(t.amount)}
                            </TableCell>
                         </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center h-24">No transactions found for the selected filters.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
                 <TableFooter>
                    <TableRow>
                        <TableCell colSpan={4}></TableCell>
                        <TableCell className="text-right font-bold">Total Income:</TableCell>
                        <TableCell className="text-right font-bold text-green-600">{formatCurrency(totalIncome)}</TableCell>
                    </TableRow>
                     <TableRow>
                        <TableCell colSpan={4}></TableCell>
                        <TableCell className="text-right font-bold">Total Expenses:</TableCell>
                        <TableCell className="text-right font-bold text-red-600">{formatCurrency(totalExpenses)}</TableCell>
                    </TableRow>
                     <TableRow>
                        <TableCell colSpan={4}></TableCell>
                        <TableCell className="text-right font-bold">Net Flow:</TableCell>
                        <TableCell className={cn("text-right font-bold", totalIncome - totalExpenses >= 0 ? 'text-green-600' : 'text-red-600')}>
                            {formatCurrency(totalIncome - totalExpenses)}
                        </TableCell>
                    </TableRow>
                </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

    

    

    