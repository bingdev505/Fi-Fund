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
  ArrowRightLeft,
  Loader2,
} from 'lucide-react';
import type { Transaction, Debt } from '@/lib/types';
import { useMemo } from 'react';
import { WithId } from '@/firebase/firestore/use-collection';

export default function EntryList() {
  const { transactions, debts, currency, bankAccounts, isLoading } = useFinancials();

  const allEntries = useMemo(() => {
    const combined = [
      ...transactions.map(t => ({...t, date: new Date(t.date as string)})),
      ...debts.map(d => ({...d, date: new Date(d.date as string), dueDate: d.dueDate ? new Date(d.dueDate as string) : undefined })),
    ];
    return combined.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 20);
  }, [transactions, debts]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
  }

  const getAccountName = (accountId?: string) => {
    if (!accountId) return '';
    return bankAccounts.find(acc => acc.id === accountId)?.name || '';
  }

  if (isLoading) {
    return (
      <Card className="flex h-full items-center justify-center min-h-[200px]">
        <CardContent className="text-center text-muted-foreground p-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-2">Loading entries...</p>
        </CardContent>
      </Card>
    );
  }

  if (allEntries.length === 0) {
    return (
      <Card className="flex h-full items-center justify-center min-h-[200px]">
        <CardContent className="text-center text-muted-foreground p-6">
          <p>No entries recorded yet.</p>
        </CardContent>
      </Card>
    );
  }

  const renderIcon = (entry: WithId<Transaction> | WithId<Debt>) => {
    switch (entry.type) {
      case 'income':
        return <TrendingUp className="h-6 w-6 text-primary" />;
      case 'expense':
        return <TrendingDown className="h-6 w-6 text-destructive" />;
      case 'transfer':
        return <ArrowRightLeft className="h-6 w-6 text-muted-foreground" />;
      case 'creditor':
        return <Landmark className="h-6 w-6 text-destructive" />;
      case 'debtor':
        return <User className="h-6 w-6 text-primary" />;
    }
  };

  const renderEntry = (entry: WithId<Transaction> | WithId<Debt>) => {
    const isTransaction = 'category' in entry;
    const color = entry.type === 'income' || entry.type === 'debtor' ? 'text-primary' : entry.type === 'transfer' ? '' : 'text-destructive';
    
    return (
        <div className="flex items-start justify-between py-3">
            <div className="flex items-center gap-4">
                {renderIcon(entry)}
                <div>
                    <p className="text-sm font-medium leading-none">
                        {isTransaction ? (entry as WithId<Transaction>).description : (entry as WithId<Debt>).name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                        {isTransaction ? 
                          ((entry as WithId<Transaction>).type === 'transfer' ? 
                            `${getAccountName((entry as WithId<Transaction>).fromAccountId)} → ${getAccountName((entry as WithId<Transaction>).toAccountId)}` :
                            `${(entry as WithId<Transaction>).category} (${getAccountName((entry as WithId<Transaction>).accountId)})`)
                          : (entry as WithId<Debt>).description}
                        &bull; {(entry.date as Date).toLocaleDateString()}
                    </p>
                    {!isTransaction && (entry as WithId<Debt>).dueDate && (
                        <p className="text-xs text-muted-foreground">Due: {((entry as WithId<Debt>).dueDate as Date).toLocaleDateString()}</p>
                    )}
                </div>
            </div>
            <div className={`font-semibold text-right ${color}`}>
            {formatCurrency(entry.amount)}
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
