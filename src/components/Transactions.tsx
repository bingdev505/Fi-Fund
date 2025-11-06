'use client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import EntryForm from './EntryForm';
import EntryList from './EntryList';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { PlusCircle, RefreshCw, Loader2 } from 'lucide-react';
import { useFinancials } from '@/hooks/useFinancials';
import { useToast } from '@/hooks/use-toast';
import { syncToGoogleSheet } from '@/app/actions';
import { useAuth } from '@/context/AuthContext';


export default function Transactions() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { activeProject, transactions, loans, bankAccounts, clients, contacts } = useFinancials();
  const { user } = useAuth();
  const { toast } = useToast();

  const handleGoogleSync = async () => {
    if (activeProject && activeProject.id !== 'all' && activeProject.google_sheet_id) {
        setIsSyncing(true);
        toast({
            title: "Syncing...",
            description: `Syncing transactions with Google Sheet.`
        });
        
        try {
            const result = await syncToGoogleSheet({
                sheetId: activeProject.google_sheet_id,
                transactions: transactions,
                loans: loans,
                bankAccounts: bankAccounts,
                clients: clients,
                contacts: contacts,
                userId: user!.id,
                readFromSheet: true,
            });

            if (result.success) {
                toast({
                    title: "Sync Successful",
                    description: result.message,
                });
            } else {
                throw new Error(result.message);
            }

        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: "Sync Failed",
                description: error.message || "An unknown error occurred during sync.",
            });
        } finally {
            setIsSyncing(false);
        }

    } else {
        toast({
            variant: 'destructive',
            title: "Google Sheet Not Connected",
            description: "Please add a Google Sheet ID to this business in the Business settings page to enable sync.",
        });
    }
  }

  return (
    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <div className="space-y-6">
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Transactions</CardTitle>
                        <CardDescription>View and manage all your transactions.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={handleGoogleSync} disabled={activeProject?.id === 'all' || isSyncing}>
                            {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                            Sync with Google
                        </Button>
                        <DialogTrigger asChild>
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Transaction
                            </Button>
                        </DialogTrigger>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
            <EntryList />
            </CardContent>
        </Card>
        </div>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Add a New Transaction</DialogTitle>
            </DialogHeader>
            <EntryForm onFinished={() => setIsFormOpen(false)} />
        </DialogContent>
    </Dialog>
  );
}
