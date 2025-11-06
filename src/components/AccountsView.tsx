'use client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useFinancials } from '@/hooks/useFinancials';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Landmark, Loader2, Star, Pencil, Trash2, Link } from 'lucide-react';
import { Badge } from './ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { useState, useMemo } from 'react';
import type { BankAccount, Project } from '@/lib/types';
import BankAccountForm from './BankAccountForm';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

export default function AccountsView() {
  const { currency, bankAccounts, setPrimaryBankAccount, isLoading, deleteBankAccount, linkBankAccount, activeProject, allBankAccounts, projects } = useFinancials();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<BankAccount | null>(null);
  const [linkAccountOpen, setLinkAccountOpen] = useState(false);
  const [selectedLinkAccount, setSelectedLinkAccount] = useState<string | undefined>();
  
  const personalProject = useMemo(() => projects.find(p => p.name === 'Personal'), [projects]);

  const personalAccounts = useMemo(() => {
    if (!personalProject) return [];
    return allBankAccounts.filter(acc => acc.project_id === personalProject.id);
  }, [allBankAccounts, personalProject]);


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

  const handleLinkAccount = () => {
    if (selectedLinkAccount && activeProject) {
        linkBankAccount(selectedLinkAccount, activeProject.id);
        toast({ title: 'Account Linked', description: 'The personal account has been linked to this business.' });
        setLinkAccountOpen(false);
        setSelectedLinkAccount(undefined);
    } else {
        toast({ variant: 'destructive', title: 'Please select an account to link.' });
    }
  }

  const isPersonalBusiness = activeProject?.id === personalProject?.id;

  return (
    <Dialog open={formOpen} onOpenChange={(open) => {
      setFormOpen(open);
      if (!open) setEditingAccount(null);
    }}>
      <AlertDialog>
        <Dialog open={linkAccountOpen} onOpenChange={setLinkAccountOpen}>
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Bank Accounts</CardTitle>
                <CardDescription>Add and manage your bank accounts for this business.</CardDescription>
              </div>
               <div className="flex items-center gap-2">
                 {!isPersonalBusiness && (
                     <DialogTrigger asChild>
                         <Button variant="outline">
                             <Link className="mr-2 h-4 w-4" />
                             Link Existing Account
                         </Button>
                     </DialogTrigger>
                 )}
                <Button onClick={handleAddClick}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Account
                </Button>
               </div>
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
                          {account.is_primary ? (
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
                  <p className="text-muted-foreground text-sm">You haven't added any bank accounts for this business yet.</p>
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
         <DialogContent>
            <DialogHeader>
                <DialogTitle>Link a Personal Account</DialogTitle>
                <CardDescription>Select one of your personal accounts to link to this business.</CardDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <Select value={selectedLinkAccount} onValueChange={setSelectedLinkAccount}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a personal account" />
                    </SelectTrigger>
                    <SelectContent>
                        {personalAccounts.map(acc => (
                            <SelectItem key={acc.id} value={acc.id}>
                                {acc.name} ({formatCurrency(acc.balance)})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button onClick={handleLinkAccount} className="w-full">
                    <Link className="mr-2 h-4 w-4" />
                    Link Account
                </Button>
            </div>
        </DialogContent>
        </Dialog>
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
