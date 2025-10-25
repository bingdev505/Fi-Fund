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
  Trash2,
  Pencil,
} from 'lucide-react';
import type { Transaction, Debt } from '@/lib/types';
import { useMemo, useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import EditEntryForm from './EditEntryForm';
import { useToast } from '@/hooks/use-toast';
import { parseISO } from 'date-fns';

type EntryListProps = {
  limit?: number;
  showHeader?: boolean;
}

export default function EntryList({ limit, showHeader = true }: EntryListProps) {
  const { transactions, debts, currency, bankAccounts, clients, isLoading, deleteTransaction, deleteDebt } = useFinancials();
  const [editingEntry, setEditingEntry] = useState<Transaction | Debt | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<Transaction | Debt | null>(null);
  const { toast } = useToast();

  const allEntries = useMemo(() => {
    const toDate = (date: any) => {
        return parseISO(date);
    }

    const combined: (Transaction | Debt)[] = [
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

  const getClientName = (clientId?: string) => {
    if (!clientId) return '';
    return clients.find(c => c.id === clientId)?.name || '';
  }

  const handleDelete = () => {
    if (!deletingEntry) return;

    if ('category' in deletingEntry) {
      deleteTransaction(deletingEntry as Transaction);
      toast({ title: "Transaction Deleted" });
    } else {
      deleteDebt(deletingEntry as Debt);
      toast({ title: "Debt Deleted" });
    }
    setDeletingEntry(null);
  };

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
    
    let subtext = '';
    if (isTransaction) {
        const tx = entry as Transaction;
        if (tx.type === 'transfer') {
            subtext = `Transfer: ${getAccountName(tx.fromAccountId)} → ${getAccountName(tx.toAccountId)}`;
        } else {
            const clientName = tx.clientId ? ` (${getClientName(tx.clientId)})` : '';
            subtext = `${tx.category}${clientName} (${getAccountName(tx.accountId)})`;
        }
    } else {
        const debt = entry as Debt;
        subtext = `${debt.description} (${getAccountName(debt.accountId)})`;
    }


    return (
        <div className="flex items-start justify-between py-3 group">
            <div className="flex items-center gap-4">
                {renderIcon(entry)}
                <div>
                    <p className="text-sm font-medium leading-none">
                        {isTransaction ? (entry as Transaction).description : (entry as Debt).name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                        {subtext} • {(entry.date as Date).toLocaleDateString()}
                    </p>
                    {!isTransaction && (entry as Debt).dueDate && (
                        <p className="text-xs text-muted-foreground">Due: {((entry as Debt).dueDate as Date).toLocaleDateString()}</p>
                    )}
                </div>
            </div>
            <div className='flex items-center gap-1'>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => setEditingEntry(entry)}>
                            <Pencil className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => setDeletingEntry(entry)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </AlertDialogTrigger>
                </div>
                <div className={`font-semibold text-right shrink-0 w-[90px] ${color}`}>
                    {formatCurrency(entry.amount)}
                </div>
            </div>
        </div>
    );
  }

  const Wrapper = showHeader ? ScrollArea : 'div';
  const wrapperProps = showHeader ? { className: "h-full max-h-[500px] rounded-md border" } : {};

  return (
    <Dialog onOpenChange={(isOpen) => !isOpen && setEditingEntry(null)}>
        <AlertDialog onOpenChange={(isOpen) => !isOpen && setDeletingEntry(null)}>
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
            
            {editingEntry && (
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Entry</DialogTitle>
                    </DialogHeader>
                    <EditEntryForm entry={editingEntry} onFinished={() => setEditingEntry(null)} />
                </DialogContent>
            )}

            {deletingEntry && (
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete this entry and update your account balances.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            )}
        </AlertDialog>
    </Dialog>
  );
}
