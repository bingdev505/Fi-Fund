'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useFinancials } from '@/hooks/useFinancials';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Landmark, Loader2, Star, Pencil, Trash2 } from 'lucide-react';
import { Badge } from './ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { useState } from 'react';
import type { BankAccount } from '@/lib/types';
import BankAccountForm from './BankAccountForm';

export default function AccountsView() {
  const { currency, bankAccounts, setPrimaryBankAccount, isLoading, deleteBankAccount } = useFinancials();
  const { toast } = useToast();
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<BankAccount | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
  };

  function handleSetPrimary(accountId: string) {
    setPrimaryBankAccount(accountId);
    toast({
      title: 'Primary Account Updated',
      description: 'Your primary bank account has been changed.',
    });
  }

  const handleDelete = () => {
    if (!deletingAccount) return;
    deleteBankAccount(deletingAccount.id);
    toast({ title: "Bank Account Deleted" });
    setDeletingAccount(null);
  };
  
  const handleEditClick = (account: BankAccount) => {
    setEditingAccount(account);
    setFormOpen(true);
  }
  
  const handleAddClick = () => {
    setEditingAccount(null);
    setFormOpen(true);
  }

  return (
    <Dialog open={formOpen} onOpenChange={(open) => {
      setFormOpen(open);
      if (!open) setEditingAccount(null);
    }}>
      <AlertDialog>
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Bank Accounts</CardTitle>
                <CardDescription>Add and manage your bank accounts.</CardDescription>
              </div>
              <Button onClick={handleAddClick}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Account
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div>
              {isLoading ? (
                <div className="flex justify-center items-center h-24">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : bankAccounts.length > 0 ? (
                <div className="border rounded-md">
                  <ul className="divide-y divide-border">
                    {bankAccounts.map(account => (
                      <li key={account.id} className="flex items-center justify-between p-4 group hover:bg-muted/50">
                        <div className="flex items-center gap-4">
                            <Landmark className="h-6 w-6 text-muted-foreground" />
                            <div>
                              <span className="font-medium">{account.name}</span>
                              <div className="text-sm text-muted-foreground">{formatCurrency(account.balance)}</div>
                            </div>
                        </div>
                        <div className='flex items-center gap-2'>
                          {account.isPrimary ? (
                              <Badge variant="outline" className='text-primary border-primary'>
                                  <Star className='mr-1 h-3 w-3' />
                                  Primary
                              </Badge>
                          ) : (
                              <Button variant="ghost" size="sm" onClick={() => handleSetPrimary(account.id)}>
                                  Set as Primary
                              </Button>
                          )}
                           <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                              <Button variant="ghost" size="icon" onClick={() => handleEditClick(account)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => setDeletingAccount(account)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-center py-10 border-dashed border-2 rounded-md">
                  <p className="text-muted-foreground text-sm">You haven't added any bank accounts yet.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this bank account.
              Transactions associated with this account will not be deleted but will become unlinked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingAccount(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingAccount ? 'Edit' : 'Add'} Bank Account</DialogTitle>
        </DialogHeader>
        <BankAccountForm account={editingAccount} onFinished={() => {
            setFormOpen(false);
            setEditingAccount(null);
        }} />
      </DialogContent>
    </Dialog>
  );
}
