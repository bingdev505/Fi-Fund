
'use client';

import { useFinancials } from '@/hooks/useFinancials';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Loader2,
  Trash2,
  Pencil,
  Handshake,
} from 'lucide-react';
import type { Transaction, Loan } from '@/lib/types';
import { useMemo, useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import EditEntryForm from './EditEntryForm';
import { useToast } from '@/hooks/use-toast';
import { parseISO } from 'date-fns';

type EntryListProps = {
  limit?: number;
  showHeader?: boolean;
  showControls?: boolean;
}

const PAGE_SIZE = 20;

export default function EntryList({ limit, showHeader = true, showControls = true }: EntryListProps) {
  const { transactions, loans, currency, bankAccounts, clients, isLoading, deleteTransaction, deleteLoan, contacts } = useFinancials();
  const [editingEntry, setEditingEntry] = useState<Transaction | Loan | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<Transaction | Loan | null>(null);
  const { toast } = useToast();
  
  const [visibleCount, setVisibleCount] = useState(limit || PAGE_SIZE);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isFullyLoaded, setIsFullyLoaded] = useState(false);

  const allEntries = useMemo(() => {
    const combined: (Transaction | Loan)[] = [...transactions, ...loans];
    
    const sorted = combined.sort((a, b) => {
        const dateA = new Date(a.date || (a as Loan).created_at).getTime();
        const dateB = new Date(b.date || (b as Loan).created_at).getTime();
        return dateB - dateA;
    });

    return sorted;
  }, [transactions, loans]);

  const visibleEntries = useMemo(() => {
      return allEntries.slice(0, visibleCount);
  }, [allEntries, visibleCount]);

  useEffect(() => {
    if (limit) {
      setVisibleCount(limit);
      setIsFullyLoaded(true);
    } else {
      setVisibleCount(PAGE_SIZE);
      setIsFullyLoaded(allEntries.length <= PAGE_SIZE);
    }
  }, [allEntries.length, limit]);


  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || limit) return;

    const handleScroll = () => {
      if (viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 200) {
        if (visibleCount < allEntries.length) {
            const nextCount = Math.min(visibleCount + PAGE_SIZE, allEntries.length);
            setVisibleCount(nextCount);
            if(nextCount === allEntries.length){
                setIsFullyLoaded(true);
            }
        }
      }
    };
    
    viewport.addEventListener('scroll', handleScroll);
    return () => viewport.removeEventListener('scroll', handleScroll);
  }, [visibleCount, allEntries.length, limit]);


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
  }

  const getAccountName = (account_id?: string) => {
    if (!account_id) return '';
    return bankAccounts.find(acc => acc.id === account_id)?.name || '';
  }

  const getClientName = (client_id?: string) => {
    if (!client_id) return '';
    return clients.find(c => c.id === client_id)?.name || '';
  }

  const getContactName = (contact_id?: string) => {
    if (!contact_id) return '';
    return contacts.find(c => c.id === contact_id)?.name || '';
  }

  const handleDelete = () => {
    if (!deletingEntry) return;

    if ('category' in deletingEntry) {
      deleteTransaction(deletingEntry as Transaction);
      toast({ title: "Transaction Deleted" });
    } else {
      deleteLoan((deletingEntry as Loan).id);
      toast({ title: "Loan Deleted" });
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

  const renderIcon = (entry: Transaction | Loan) => {
    const iconContainerClass = "h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-full";
    const iconClass = "h-5 w-5";

    switch (entry.type) {
      case 'income':
        return <div className={`${iconContainerClass} bg-green-100 dark:bg-green-900/50`}><TrendingUp className={`${iconClass} text-green-600 dark:text-green-400`} /></div>;
      case 'expense':
        return <div className={`${iconContainerClass} bg-red-100 dark:bg-red-900/50`}><TrendingDown className={`${iconClass} text-red-600 dark:text-red-400`} /></div>;
      case 'transfer':
        return <div className={`${iconContainerClass} bg-blue-100 dark:bg-blue-900/50`}><ArrowRightLeft className={`${iconClass} text-blue-600 dark:text-blue-400`} /></div>;
      case 'loanGiven':
        return <div className={`${iconContainerClass} bg-indigo-100 dark:bg-indigo-900/50`}><Handshake className={`${iconClass} text-indigo-600 dark:text-indigo-400`} /></div>;
      case 'loanTaken':
        return <div className={`${iconContainerClass} bg-orange-100 dark:bg-orange-900/50`}><Handshake className={`${iconClass} text-orange-600 dark:text-orange-400`} /></div>;
       case 'repayment':
         return <div className={`${iconContainerClass} bg-teal-100 dark:bg-teal-900/50`}><Handshake className={`${iconClass} text-teal-600 dark:text-teal-400`} /></div>;
    }
  };

  const renderEntry = (entry: Transaction | Loan) => {
    const isTransaction = 'category' in entry;
    
    let color = '';
    if (entry.type === 'income' || entry.type === 'loanTaken') {
        color = 'text-green-600';
    } else if (entry.type === 'expense' || entry.type === 'loanGiven') {
        color = 'text-red-600';
    } else if (entry.type === 'repayment') {
        const relatedLoan = loans.find(l => l.id === (entry as Transaction).loan_id);
        if (relatedLoan?.type === 'loanGiven') { // Repayment for a loan you gave out is money IN
            color = 'text-green-600';
        } else { // Repayment for a loan you took is money OUT
            color = 'text-red-600';
        }
    }

    let title = '';
    let subtext = '';

    if (isTransaction) {
        const tx = entry as Transaction;
        title = tx.description || tx.category;
        if (tx.type === 'transfer') {
            title = "Bank Transfer";
            subtext = `Transfer: ${getAccountName(tx.from_account_id)} → ${getAccountName(tx.to_account_id)}`;
        } else {
            const clientName = tx.client_id ? ` (${getClientName(tx.client_id)})` : '';
            const accountName = getAccountName(tx.account_id);
            subtext = `${tx.category}${clientName}${accountName ? ` (${accountName})` : ''}`;
        }
    } else {
        const loan = entry as Loan;
        const contactName = getContactName(loan.contact_id);
        title = loan.type === 'loanGiven' ? `Loan to ${contactName}` : `Loan from ${contactName}`;
        const description = loan.description ? `${loan.description} ` : '';
        const accountName = getAccountName(loan.account_id);
        subtext = `${description}${accountName ? `(${accountName})` : ''}`;
    }

    const entryDate = entry.date ? parseISO(entry.date as any) : parseISO((entry as Loan).created_at);
    const dueDate = (entry as Loan).due_date ? parseISO((entry as Loan).due_date) : undefined;

    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between py-3 group hover-mobile-bg-muted gap-2">
            <div className="flex items-center gap-4 flex-1">
                {renderIcon(entry)}
                <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium leading-none">
                            {title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {subtext} • {entryDate instanceof Date ? entryDate.toLocaleDateString() : String(entryDate)}
                        </p>
                      </div>
                      <div className={`sm:hidden font-semibold text-left mt-1 ${color}`}>
                          {formatCurrency(entry.amount)}
                      </div>
                    </div>
                    {!isTransaction && dueDate && (
                        <p className="text-xs text-muted-foreground mt-1">Due: {dueDate instanceof Date ? dueDate.toLocaleDateString() : String(dueDate)}</p>
                    )}
                </div>
            </div>
            <div className='flex items-center gap-1 self-end sm:self-center'>
                {showControls && (
                    <div className="group-hover-mobile-opacity flex items-center">
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
                )}
                <div className={`hidden sm:block font-semibold text-right shrink-0 w-[110px] ${color}`}>
                    {formatCurrency(entry.amount)}
                </div>
            </div>
        </div>
    );
  }

  const Wrapper = showHeader ? ScrollArea : 'div';
  const wrapperProps = showHeader ? { className: "h-full max-h-[500px] rounded-md border", viewportRef: viewportRef } : { ref: viewportRef, className: "max-h-[calc(100vh-200px)] overflow-y-auto no-scrollbar" };

  return (
    <Dialog onOpenChange={(isOpen) => !isOpen && setEditingEntry(null)}>
        <AlertDialog onOpenChange={(isOpen) => !isOpen && setDeletingEntry(null)}>
            <Wrapper {...wrapperProps}>
            <div className={showHeader ? 'p-4' : ''}>
                {visibleEntries.map((entry, index) => (
                <div key={entry.id}>
                    {renderEntry(entry)}
                    {index < visibleEntries.length - 1 && <Separator />}
                </div>
                ))}
                {!isFullyLoaded && !isLoading && (
                  <div className="flex justify-center items-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}
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
