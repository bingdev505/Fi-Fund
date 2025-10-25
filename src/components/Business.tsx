'use client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useFinancials } from '@/hooks/useFinancials';
import { Loader2, Folder, Pencil, Trash2 } from 'lucide-react';
import ProjectForm from './ProjectForm';
import { Button } from './ui/button';
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import type { Project } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

export default function Business() {
  const { isLoading, projects, deleteProject, bankAccounts, transactions, currency } = useFinancials();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  const handleAddClick = () => {
    setEditingProject(null);
    setFormOpen(true);
  };
  
  const handleEditClick = (project: Project) => {
    setEditingProject(project);
    setFormOpen(true);
  };

  const handleDelete = () => {
    if (!deletingProject) return;
    deleteProject(deletingProject.id);
    toast({ title: "Business Deleted" });
    setDeletingProject(null);
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
  };

  const projectBalances = useMemo(() => {
    const balances = new Map<string, number>();
    
    // This is a simplified balance calculation. 
    // For a real app, you might want to calculate based on transactions for each project.
    // Here we just distribute the total bank balance for demonstration.
    const totalBalance = bankAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const nonAllBusinessProjects = projects.filter(p => p.name !== 'All Business');

    projects.forEach(p => {
        if (p.name === 'All Business') {
            balances.set(p.id, totalBalance);
        } else {
            // A more complex logic would be needed here to get per-project balance.
            // For now, let's just show a portion of the total balance as a placeholder.
            const projectTransactions = transactions.filter(t => t.projectId === p.id);
            const income = projectTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
            const expense = projectTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
            balances.set(p.id, income - expense);
        }
    });
    return balances;
  }, [projects, bankAccounts, transactions, currency]);


  return (
    <Dialog open={formOpen} onOpenChange={(open) => {
      setFormOpen(open);
      if (!open) setEditingProject(null);
    }}>
      <AlertDialog>
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Manage Businesses</CardTitle>
                <CardDescription>Add or manage your businesses (projects).</CardDescription>
              </div>
              <Button onClick={handleAddClick}>Add New Business</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div>
              <h3 className="text-lg font-medium mb-4">Your Businesses</h3>
              {isLoading ? (
                <div className="flex justify-center items-center h-24">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : projects.length > 0 ? (
                <div className="border rounded-md">
                  <ul className="divide-y divide-border">
                    {projects.map(project => (
                      <li key={project.id} className="flex items-center justify-between p-4 group hover:bg-muted/50">
                        <div className="flex items-center gap-4">
                            <Folder className="h-6 w-6 text-muted-foreground" />
                            <div>
                              <span className="font-medium">{project.name}</span>
                              {project.parentProjectId && (
                                <p className="text-xs text-muted-foreground">
                                  Sub-business of: {projects.find(p => p.id === project.parentProjectId)?.name}
                                </p>
                              )}
                            </div>
                        </div>
                        <div className='flex items-center gap-4'>
                          <div className="font-semibold text-right">
                              {formatCurrency(projectBalances.get(project.id) || 0)}
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(project)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => setDeletingProject(project)}>
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
                  <p className="text-muted-foreground text-sm">You haven't added any businesses yet.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this business and all associated clients, categories, transactions and debts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingProject(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingProject ? 'Edit' : 'Create a new'} Business</DialogTitle>
        </DialogHeader>
        <ProjectForm project={editingProject} onFinished={() => {
          setFormOpen(false);
          setEditingProject(null);
        }}/>
      </DialogContent>
    </Dialog>
  );
}
