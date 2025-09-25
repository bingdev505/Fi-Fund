'use client';

import { useFinancials } from '@/hooks/useFinancials';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  TrendingUp,
  TrendingDown,
  Landmark,
  User,
} from 'lucide-react';
import type { Transaction, Debt } from '@/lib/types';
import { useMemo } from 'react';

export default function EntryList() {
  const { transactions, debts } = useFinancials();

  const allEntries = useMemo(() => {
    const combined = [
      ...transactions,
      ...debts,
    ];
    return combined.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 20);
  }, [transactions, debts]);


  if (allEntries.length === 0) {
    return (
      <Card className="flex h-full items-center justify-center min-h-[200px]">
        <CardContent className="text-center text-muted-foreground p-6">
          <p>No entries recorded yet.</p>
        </CardContent>
      </Card>
    );
  }

  const renderIcon = (entry: Transaction | Debt) => {
    switch (entry.type) {
      case 'income':
        return <TrendingUp className="h-6 w-6 text-primary" />;
      case 'expense':
        return <TrendingDown className="h-6 w-6 text-destructive" />;
      case 'creditor':
        return <Landmark className="h-6 w-6 text-destructive" />;
      case 'debtor':
        return <User className="h-6 w-6 text-primary" />;
    }
  };

  const renderEntry = (entry: Transaction | Debt) => {
    const isTransaction = 'category' in entry;
    const color = entry.type === 'income' || entry.type === 'debtor' ? 'text-primary' : 'text-destructive';
    
    return (
        <div className="flex items-start justify-between py-3">
            <div className="flex items-center gap-4">
                {renderIcon(entry)}
                <div>
                    <p className="text-sm font-medium leading-none">
                        {isTransaction ? entry.description : entry.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                        {isTransaction ? entry.category : entry.description} &bull; {entry.date.toLocaleDateString()}
                    </p>
                    {!isTransaction && (entry as Debt).dueDate && (
                        <p className="text-xs text-muted-foreground">Due: {(entry as Debt).dueDate!.toLocaleDateString()}</p>
                    )}
                </div>
            </div>
            <div className={`font-semibold text-right ${color}`}>
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(entry.amount)}
            </div>
        </div>
    );
  }

  return (
    <ScrollArea className="h-full max-h-[500px] rounded-md border">
      <div className="p-4">
        {allEntries.map((entry, index) => (
          <div key={entry.id}>
            {renderEntry(entry)}
            {index < allEntries.length - 1 && <Separator />}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
