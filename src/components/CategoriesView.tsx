'use client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useFinancials } from '@/hooks/useFinancials';
import { Loader2, Tag, PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import type { Category } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import CategoryForm from './CategoryForm';

export default function CategoriesView() {
  const { isLoading, categories, deleteCategory } = useFinancials();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  
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

  return (
    <Dialog open={formOpen} onOpenChange={(open) => {
        setFormOpen(open);
        if (!open) setEditingCategory(null);
    }}>
      <AlertDialog>
        <Card>
          <CardHeader>
             <div className="flex justify-between items-center">
              <div>
                <CardTitle>Manage Categories</CardTitle>
                <CardDescription>Add or manage your custom categories for the active business.</CardDescription>
              </div>
              <Button onClick={handleAddClick}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Category
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div>
              <h3 className="text-lg font-medium mb-4">Your Custom Categories</h3>
              {isLoading ? (
                <div className="flex justify-center items-center h-24">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : categories.length > 0 ? (
                <div className="border rounded-md">
                  <ul className="divide-y divide-border">
                    {categories.map(cat => (
                      <li key={cat.id} className="flex items-center justify-between p-4 group hover:bg-muted/50">
                        <div className="flex items-center gap-4">
                          <Tag className="h-6 w-6 text-muted-foreground" />
                          <div>
                            <span className="font-medium">{cat.name}</span>
                          </div>
                        </div>
                        <div className='flex items-center gap-2'>
                          <div className={`text-sm font-medium px-2 py-1 rounded-md ${cat.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {cat.type.charAt(0).toUpperCase() + cat.type.slice(1)}
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
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
