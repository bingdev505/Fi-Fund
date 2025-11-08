
'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import FinancialChart from './FinancialChart';
import { useFinancials } from '@/hooks/useFinancials';
import { generateFinancialInsights } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Lightbulb, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import type { Transaction } from '@/lib/types';

type ReportPeriod = 'weekly' | 'monthly' | 'annual';

export default function Reports() {
  const { allTransactions, loans, projects } = useFinancials();
  const [insight, setInsight] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [period, setPeriod] = useState<ReportPeriod>('annual');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');

  const handleGenerateInsights = async () => {
    setIsLoading(true);
    setInsight(null);
    const financialData = `
      Income: ${JSON.stringify(filteredTransactions.filter(t => t.type === 'income'))}
      Expenses: ${JSON.stringify(filteredTransactions.filter(t => t.type === 'expense'))}
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
  
  const filteredTransactions = useMemo(() => {
    if (selectedProjectId === 'all') {
      return allTransactions;
    }
    return allTransactions.filter(t => t.project_id === selectedProjectId);
  }, [allTransactions, selectedProjectId]);

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
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Select Business" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Business</SelectItem>
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
          <FinancialChart transactions={filteredTransactions} period={period} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI-Powered Insights</CardTitle>
          <CardDescription>Get a summary and insights into your financial situation from our AI assistant.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleGenerateInsights} disabled={isLoading || filteredTransactions.length === 0}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
            Generate AI Insights
          </Button>
          {filteredTransactions.length === 0 && <p className="text-sm text-muted-foreground mt-2">Add some transactions to generate insights.</p>}
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
