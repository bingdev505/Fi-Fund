'use client';

import { useState, useMemo } from 'react';
import { useFinancials } from '@/hooks/useFinancials';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PlusCircle, TrendingUp, Pencil, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import type { Investment } from '@/lib/types';
import InvestmentForm from './InvestmentForm';
import { format, parseISO } from 'date-fns';
import { Badge } from './ui/badge';

export default function InvestmentsView() {
  const { investments, deleteInvestment, currency } = useFinancials();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [deletingInvestment, setDeletingInvestment] = useState<Investment | null>(null);

  const handleAddClick = () => {
    setEditingInvestment(null);
    setFormOpen(true);
  };
  
  const handleEditClick = (investment: Investment) => {
    setEditingInvestment(investment);
    setFormOpen(true);
  };

  const handleDelete = () => {
    if (!deletingInvestment) return;
    deleteInvestment(deletingInvestment.id);
    toast({ title: "Investment Deleted" });
    setDeletingInvestment(null);
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
  };

  const totalCurrentValue = useMemo(() => {
    return investments.reduce((total, inv) => total + (inv.current_value || inv.amount), 0);
  }, [investments]);
  
  const totalInvested = useMemo(() => {
    return investments.reduce((total, inv) => total + inv.amount, 0);
  }, [investments]);

  return (
    <Dialog open={formOpen} onOpenChange={(open) => {
      setFormOpen(open);
      if (!open) setEditingInvestment(null);
    }}>
      <AlertDialog>
        <Card>
          <CardHeader>
             <div className="flex justify-between items-center">
              <div>
                <CardTitle>Manage Investments</CardTitle>
                <CardDescription>
                  Total Value: {formatCurrency(totalCurrentValue)} | Total Invested: {formatCurrency(totalInvested)}
                </CardDescription>
              </div>
              <Button onClick={handleAddClick}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Investment
              </Button>
            </div>
          </CardHeader>
          <CardContent>
             {investments.length > 0 ? (
                <div className="border rounded-md">
                  <ul className="divide-y divide-border">
                    {investments.map(inv => (
                      <li key={inv.id} className="p-4 group hover-mobile-bg-muted">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="flex items-center gap-4">
                              <TrendingUp className="h-6 w-6 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{inv.name}</p>
                                <p className="text-sm text-muted-foreground">{inv.investment_type} {inv.broker_name ? `via ${inv.broker_name}` : ''}</p>
                                <p className="text-xs text-muted-foreground">Invested on {format(parseISO(inv.date), 'PPP')}</p>
                              </div>
                            </div>
                            <div className='flex items-center gap-4 self-end sm:self-center'>
                              <div className='text-right'>
                                <p className='font-semibold'>{formatCurrency(inv.current_value || inv.amount)}</p>
                                <p className='text-xs text-muted-foreground'>Invested: {formatCurrency(inv.amount)}</p>
                              </div>
                              <div className="group-hover-mobile-opacity flex items-center">
                                <Button variant="ghost" size="icon" onClick={() => handleEditClick(inv)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => setDeletingInvestment(inv)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                              </div>
                            </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-center py-10 border-dashed border-2 rounded-md">
                  <p className="text-muted-foreground text-sm">You haven't logged any investments for this business yet.</p>
                </div>
              )}
          </CardContent>
        </Card>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this investment record.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeletingInvestment(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
       <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingInvestment ? 'Edit' : 'Add'} Investment</DialogTitle>
            </DialogHeader>
            <InvestmentForm investment={editingInvestment} onFinished={() => {
                setFormOpen(false);
                setEditingInvestment(null);
            }} />
        </DialogContent>
    </Dialog>
  );
}
