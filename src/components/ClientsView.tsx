'use client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useFinancials } from '@/hooks/useFinancials';
import { Loader2, User, PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo } from 'react';
import type { Client } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import ClientForm from './ClientForm';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { DateRangePicker } from './ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { subDays } from 'date-fns';

export default function ClientsView() {
  const { isLoading, clients, deleteClient, allTransactions, currency } = useFinancials();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });

  const handleAddClick = () => {
    setEditingClient(null);
    setFormOpen(true);
  };
  
  const handleEditClick = (client: Client) => {
    setEditingClient(client);
    setFormOpen(true);
  };

  const handleDelete = () => {
    if (!deletingClient) return;
    deleteClient(deletingClient.id);
    toast({ title: "Client Deleted" });
    setDeletingClient(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
  };
  
  const clientFinancials = useMemo(() => {
    const financials = new Map<string, { income: number; expense: number }>();
    clients.forEach(c => financials.set(c.id, { income: 0, expense: 0 }));

    allTransactions.forEach(t => {
      const transactionDate = new Date(t.date);
      if (t.client_id && financials.has(t.client_id) && dateRange?.from && dateRange?.to && transactionDate >= dateRange.from && transactionDate <= dateRange.to) {
        const current = financials.get(t.client_id)!;
        if (t.type === 'income') {
          current.income += t.amount;
        } else if (t.type === 'expense') {
          current.expense += t.amount;
        }
        financials.set(t.client_id, current);
      }
    });

    return financials;
  }, [clients, allTransactions, dateRange, currency]);

  return (
    <Dialog open={formOpen} onOpenChange={(open) => {
      setFormOpen(open);
      if (!open) setEditingClient(null);
    }}>
      <AlertDialog>
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
              <div>
                <CardTitle>Manage Clients</CardTitle>
                <CardDescription>Add or manage your clients for the active business.</CardDescription>
              </div>
              <div className='flex items-center gap-2 w-full md:w-auto'>
                <DateRangePicker date={dateRange} onDateChange={setDateRange} className="w-full md:w-auto" />
                <Button onClick={handleAddClick} className="w-full md:w-auto">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Client
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div>
              <h3 className="text-lg font-medium mb-4">Your Clients</h3>
              {isLoading ? (
                <div className="flex justify-center items-center h-24">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : clients.length > 0 ? (
                <div className="border rounded-md">
                  <ul className="divide-y divide-border">
                    {clients.map(client => (
                      <li key={client.id} className="flex items-center justify-between p-4 group hover:bg-muted/50">
                        <div className="flex items-center gap-4">
                          <User className="h-6 w-6 text-muted-foreground" />
                          <div>
                            <span className="font-medium">{client.name}</span>
                          </div>
                        </div>
                        <div className='flex items-center gap-4'>
                          <div className='text-right'>
                            <p className='text-sm font-semibold text-green-600'>{formatCurrency(clientFinancials.get(client.id)?.income || 0)}</p>
                            <p className='text-xs text-red-600'>{formatCurrency(clientFinancials.get(client.id)?.expense || 0)}</p>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(client)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => setDeletingClient(client)}>
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
                  <p className="text-muted-foreground text-sm">You haven't added any clients for this business yet.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this client.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeletingClient(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingClient ? 'Edit' : 'Add'} Client</DialogTitle>
            </DialogHeader>
            <ClientForm client={editingClient} onFinished={() => {
                setFormOpen(false);
                setEditingClient(null);
            }}/>
        </DialogContent>
    </Dialog>
  );
}
