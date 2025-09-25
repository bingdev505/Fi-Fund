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
import { Timestamp } from 'firebase/firestore';

type EntryListProps = {
  limit?: number;
  showHeader?: boolean;
}

export default function EntryList({ limit, showHeader = true }: EntryListProps) {
  const { transactions, debts, currency, bankAccounts, isLoading } = useFinancials();

  const allEntries = useMemo(() => {
    const toDate = (date: any) => {
        if (date instanceof Timestamp) {
            return date.toDate();
        }
        // Handle ISO strings or other formats if necessary
        return new Date(date);
    }

    const combined = [
      ...transactions.map(t => ({...t, date: toDate(t.date)})),
      ...debts.map(d => ({...d, date: toDate(d.date), dueDate: d.dueDate ? toDate(d.dueDate) : undefined })),
    ];
    
    const sorted = combined.sort((a, b) => b.date.getTime() - a.date.getTime());
    
    if (limit) {
      return sorted.slice(0, limit);
    }

    return sorted;
  }, [transactions, debts, limit]);

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

  const renderIcon = (entry: Transaction | Debt) => {
    const iconContainerClass = "h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-full";
    const iconClass = "h-5 w-5";

    switch (entry.type) {
      case 'income':
        return <div className={`${iconContainerClass} bg-green-100`}><TrendingUp className={`${iconClass} text-green-600`} /></div>;
      case 'expense':
        return <div className={`${iconContainerClass} bg-red-100`}><TrendingDown className={`${iconClass} text-red-600`} /></div>;
      case 'transfer':
        return <div className={`${iconContainerClass} bg-blue-100`}><ArrowRightLeft className={`${iconClass} text-blue-600`} /></div>;
      case 'creditor':
        return <div className={`${iconContainerClass} bg-orange-100`}><Landmark className={`${iconClass} text-orange-600`} /></div>;
      case 'debtor':
        return <div className={`${iconContainerClass} bg-indigo-100`}><User className={`${iconClass} text-indigo-600`} /></div>;
    }
  };

  const renderEntry = (entry: Transaction | Debt) => {
    const isTransaction = 'category' in entry;
    const color = entry.type === 'income' || entry.type === 'debtor' ? 'text-green-600' : entry.type === 'transfer' ? '' : 'text-red-600';
    
    return (
        <div className="flex items-start justify-between py-3">
            <div className="flex items-center gap-4">
                {renderIcon(entry)}
                <div>
                    <p className="text-sm font-medium leading-none">
                        {isTransaction ? (entry as Transaction).description : (entry as Debt).name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                        {isTransaction ? 
                          ((entry as Transaction).type === 'transfer' ? 
                            `Transfer: ${getAccountName((entry as Transaction).fromAccountId)} → ${getAccountName((entry as Transaction).toAccountId)}` :
                            `${(entry as Transaction).category} (${getAccountName((entry as Transaction).accountId)})`)
                          : `${(entry as Debt).description} (${getAccountName((entry as Debt).accountId)})`}
                         • {(entry.date as Date).toLocaleDateString()}
                    </p>
                    {!isTransaction && (entry as Debt).dueDate && (
                        <p className="text-xs text-muted-foreground">Due: {((entry as Debt).dueDate as Date).toLocaleDateString()}</p>
                    )}
                </div>
            </div>
            <div className={`font-semibold text-right shrink-0 ${color}`}>
            {formatCurrency(entry.amount)}
            </div>
        </div>
    );
  }

  const Wrapper = showHeader ? ScrollArea : 'div';
  const wrapperProps = showHeader ? { className: "h-full max-h-[500px] rounded-md border" } : {};

  return (
    <Wrapper {...wrapperProps}>
      <div className={showHeader ? 'p-4' : ''}>
        {allEntries.map((entry, index) => (
          <div key={entry.id}>
            {renderEntry(entry)}
            {index < allEntries.length - 1 && <Separator />}
          </div>
        ))}
      </div>
    </Wrapper>
  );
}
