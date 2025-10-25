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
  const { isLoading, projects, deleteProject, bankAccounts, currency } = useFinancials();
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
    const totalBalance = bankAccounts.reduce((sum, acc) => sum + acc.balance, 0);

    projects.forEach(p => {
        if (p.name === 'All Business') {
            balances.set(p.id, totalBalance);
        } else {
            // This is a simplified balance calculation based on transactions associated with a project.
            // A more robust solution might involve linking bank accounts to projects.
            const projectBankAccounts = bankAccounts; // In a more complex app, you'd filter accounts by project
            const balance = projectBankAccounts.reduce((sum, acc) => {
                // This is a placeholder logic. Real logic would depend on how accounts are associated with projects.
                // For now, let's just show a portion of the total balance for demonstration.
                return sum;
            }, 0);
            balances.set(p.id, balance);
        }
    });
    return balances;
  }, [projects, bankAccounts, currency]);


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
                              {/* Balance display logic will be more meaningful when accounts are tied to projects */}
                              {project.name === 'All Business' ? formatCurrency(projectBalances.get(project.id) || 0) : 'N/A'}
                          </div>
                          {project.name !== 'All Business' && (
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
                          )}
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
