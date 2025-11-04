'use client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import EntryForm from './EntryForm';
import EntryList from './EntryList';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { PlusCircle, RefreshCw } from 'lucide-react';
import { useFinancials } from '@/hooks/useFinancials';
import { useToast } from '@/hooks/use-toast';


export default function Transactions() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { activeProject } = useFinancials();
  const { toast } = useToast();

  const handleGoogleSync = () => {
    if (activeProject && activeProject.id !== 'all' && activeProject.google_sheet_id) {
        toast({
            title: "Sync Initiated (Placeholder)",
            description: `Ready to sync with sheet: ${activeProject.google_sheet_id}`
        });
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
                        <Button variant="outline" onClick={handleGoogleSync} disabled={activeProject?.id === 'all'}>
                            <RefreshCw className="mr-2 h-4 w-4" />
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
