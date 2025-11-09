
'use client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useFinancials } from '@/hooks/useFinancials';
import { Loader2, Tag, PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo } from 'react';
import type { Category } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import CategoryForm from './CategoryForm';
import { DateRangePicker } from './ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { subDays } from 'date-fns';

export default function CategoriesView() {
  const { categories, deleteCategory, currency, transactions } = useFinancials();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });
  
  const handleAddClick = () => {
    setEditingCategory(null);
    setFormOpen(true);
  };
  
  const handleEditClick = (category: Category) => {
    setEditingCategory(category);
    setFormOpen(true);
  };

  const handleDelete = () => {
    if (!deletingCategory) return;
    deleteCategory(deletingCategory.id);
    toast({ title: "Category Deleted" });
    setDeletingCategory(null);
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
  };

  const categoryFinancials = useMemo(() => {
    const financials = new Map<string, number>();
    categories.forEach(c => financials.set(c.id, 0));

    transactions.forEach(t => {
      const transactionDate = new Date(t.date);
       if (
        t.category && 
        dateRange?.from && 
        dateRange?.to && 
        transactionDate >= dateRange.from && 
        transactionDate <= dateRange.to
      ) {
        const cat = categories.find(c => c.name === t.category && c.type === t.type);
        if (cat) {
          const currentTotal = financials.get(cat.id) || 0;
          financials.set(cat.id, currentTotal + t.amount);
        }
      }
    });

    return financials;
  }, [categories, transactions, dateRange, currency]);

  return (
    <Dialog open={formOpen} onOpenChange={(open) => {
        setFormOpen(open);
        if (!open) setEditingCategory(null);
    }}>
      <AlertDialog>
        <Card>
          <CardHeader>
             <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
              <div>
                <CardTitle>Manage Categories</CardTitle>
                <CardDescription>Add or manage your custom categories for the active business.</CardDescription>
              </div>
              <div className='flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto'>
                <DateRangePicker date={dateRange} onDateChange={setDateRange} className="w-full" />
                <Button onClick={handleAddClick} className="w-full">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Category
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div>
              <h3 className="text-lg font-medium mb-4">Your Custom Categories</h3>
              {categories.length > 0 ? (
                <div className="border rounded-md">
                  <ul className="divide-y divide-border">
                    {categories.map(cat => (
                      <li key={cat.id} className="p-4 group hover-mobile-bg-muted">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="flex items-center gap-4">
                              <Tag className="h-6 w-6 text-muted-foreground" />
                              <span className="font-medium">{cat.name}</span>
                            </div>
                            <div className='flex items-center gap-4 self-end sm:self-center'>
                              <div className={`text-sm font-semibold px-2 py-1 rounded-md ${cat.type === 'income' ? 'text-green-800' : 'text-red-800'}`}>
                                {formatCurrency(categoryFinancials.get(cat.id) || 0)}
                              </div>
                              <div className="group-hover-mobile-opacity flex items-center">
                                <Button variant="ghost" size="icon" onClick={() => handleEditClick(cat)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => setDeletingCategory(cat)}>
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
                  <p className="text-muted-foreground text-sm">You haven't added any custom categories for this business yet.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this category.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeletingCategory(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
       <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingCategory ? 'Edit' : 'Add'} Category</DialogTitle>
            </DialogHeader>
            <CategoryForm category={editingCategory} onFinished={() => {
                setFormOpen(false);
                setEditingCategory(null);
            }} />
        </DialogContent>
    </Dialog>
  );
}
