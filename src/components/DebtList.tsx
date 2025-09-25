'use client';

import { useFinancials } from '@/hooks/useFinancials';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Loader2,
} from 'lucide-react';
import type { Debt } from '@/lib/types';
import { useMemo, useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { Button } from './ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import RepaymentForm from './RepaymentForm';


type DebtListProps = {
  type: 'creditor' | 'debtor';
  limit?: number;
}

export default function DebtList({ type, limit }: DebtListProps) {
  const { debts, currency, bankAccounts, isLoading } = useFinancials();
  const [openDialogId, setOpenDialogId] = useState<string | null>(null);

  const filteredDebts = useMemo(() => {
    const toDate = (date: any) => {
        if (date instanceof Timestamp) {
            return date.toDate();
        }
        return new Date(date);
    }

    const filtered = debts
      .filter(d => d.type === type && d.amount > 0)
      .map(d => ({...d, date: toDate(d.date), dueDate: d.dueDate ? toDate(d.dueDate) : undefined }));
    
    const sorted = filtered.sort((a, b) => b.date.getTime() - a.date.getTime());
    
    if (limit) {
      return sorted.slice(0, limit);
    }

    return sorted;
  }, [debts, type, limit]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
  }

  const getAccountName = (accountId?: string) => {
    if (!accountId) return '';
    return bankAccounts.find(acc => acc.id === accountId)?.name || '';
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[150px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (filteredDebts.length === 0) {
    return (
      <div className="text-center text-muted-foreground min-h-[150px] flex items-center justify-center">
        <p>No outstanding {type}s recorded yet.</p>
      </div>
    );
  }

  const renderIcon = (entry: Debt) => {
    const iconContainerClass = "h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-full";
    const iconClass = "h-5 w-5";

    switch (entry.type) {
      case 'creditor':
        return <div className={`${iconContainerClass} bg-orange-100 dark:bg-orange-900/50`}><ArrowUpCircle className={`${iconClass} text-orange-600 dark:text-orange-400`} /></div>;
      case 'debtor':
        return <div className={`${iconContainerClass} bg-indigo-100 dark:bg-indigo-900/50`}><ArrowDownCircle className={`${iconClass} text-indigo-600 dark:text-indigo-400`} /></div>;
    }
  };

  const renderEntry = (entry: Debt) => {
    const color = entry.type === 'creditor' ? 'text-red-600' : 'text-green-600';
    const RepaymentIcon = entry.type === 'debtor' ? ArrowDownCircle : ArrowUpCircle;
    
    return (
      <Dialog open={openDialogId === entry.id} onOpenChange={(isOpen) => setOpenDialogId(isOpen ? entry.id : null)}>
        <div className="flex items-start justify-between py-3">
            <div className="flex items-center gap-4">
                {renderIcon(entry)}
                <div>
                    <p className="text-sm font-medium leading-none">
                        {entry.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                        {entry.description} ({getAccountName(entry.accountId)}) • {entry.date.toLocaleDateString()}
                    </p>
                    {entry.dueDate && (
                        <p className="text-xs text-muted-foreground">Due: {entry.dueDate.toLocaleDateString()}</p>
                    )}
                </div>
            </div>
            <div className='flex items-center gap-2'>
              <div className={`font-semibold text-right shrink-0 ${color}`}>
                {formatCurrency(entry.amount)}
              </div>
               <DialogTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <RepaymentIcon className="h-5 w-5" />
                    <span className="sr-only">Log Repayment</span>
                  </Button>
               </DialogTrigger>
            </div>
        </div>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Log a Repayment</DialogTitle>
                <DialogDescription>
                    Log a full or partial payment for this debt. This will update the outstanding balance.
                </DialogDescription>
            </DialogHeader>
            <RepaymentForm debt={entry} onFinished={() => setOpenDialogId(null)} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div>
      {filteredDebts.map((entry, index) => (
        <div key={entry.id}>
          {renderEntry(entry)}
          {index < filteredDebts.length - 1 && <Separator />}
        </div>
      ))}
    </div>
  );
}
