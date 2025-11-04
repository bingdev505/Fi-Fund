'use client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useFinancials } from '@/hooks/useFinancials';
import { Loader2, Folder, Pencil, Trash2, PlusCircle } from 'lucide-react';
import ProjectForm from './ProjectForm';
import { Button } from './ui/button';
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import type { Project } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function Business() {
  const { isLoading, projects, deleteProject, currency, allTransactions, allDebts } = useFinancials();
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

  const { projectTree, projectBalances } = useMemo(() => {
    if (!projects || !allTransactions || !allDebts) {
        return { projectTree: [], projectBalances: new Map() };
    }

    const balances = new Map<string, number>();
    projects.forEach(p => balances.set(p.id, 0));

    allTransactions.forEach(t => {
      if (t.project_id && balances.has(t.project_id)) {
        let currentBalance = balances.get(t.project_id) || 0;
        if (t.type === 'income') {
          currentBalance += t.amount;
        } else if (t.type === 'expense') {
          currentBalance -= t.amount;
        }
        balances.set(t.project_id, currentBalance);
      }
    });

    allDebts.forEach(d => {
        if (d.project_id && balances.has(d.project_id)) {
            let currentBalance = balances.get(d.project_id) || 0;
            if (d.type === 'creditor') { // Money came in
                currentBalance += d.amount;
            } else if (d.type === 'debtor') { // Money went out
                currentBalance -= d.amount;
            }
            balances.set(d.project_id, currentBalance);
        }
    });
    
    // Adjust for repayments
    allTransactions.filter(t => t.type === 'repayment' && t.debt_id).forEach(repayment => {
        const relatedDebt = allDebts.find(d => d.id === repayment.debt_id);
        if (relatedDebt && relatedDebt.project_id && balances.has(relatedDebt.project_id)) {
            let currentBalance = balances.get(relatedDebt.project_id) || 0;
            if (relatedDebt.type === 'creditor') { // We are paying back, so money goes out
                currentBalance -= repayment.amount;
            } else if (relatedDebt.type === 'debtor') { // We are getting paid back, so money comes in
                currentBalance += repayment.amount;
            }
            balances.set(relatedDebt.project_id, currentBalance);
        }
    });


    const tree: (Project & { children: Project[], level: number })[] = [];
    const projectMap = new Map(projects.map(p => [p.id, { ...p, children: [], level: 0 }]));

    projects.forEach(p => {
      const projectNode = projectMap.get(p.id)!;
      if (p.parent_project_id && projectMap.has(p.parent_project_id)) {
        const parentNode = projectMap.get(p.parent_project_id)!;
        parentNode.children.push(projectNode);
        projectNode.level = parentNode.level + 1;
      }
    });
    
    projects.forEach(p => {
        if (!p.parent_project_id) {
            tree.push(projectMap.get(p.id)!);
        }
    });

    const flattenedTree: (Project & { level: number })[] = [];
    function flatten(nodes: (Project & { children: Project[], level: number })[]) {
        nodes.sort((a,b) => a.name.localeCompare(b.name)).forEach(node => {
            flattenedTree.push({ ...node });
            if (node.children.length > 0) {
                flatten(node.children);
            }
        });
    }

    flatten(tree);
    
    return { projectTree: flattenedTree, projectBalances: balances };

  }, [projects, allTransactions, allDebts, currency]);


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
              <Button onClick={handleAddClick}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New Business
              </Button>
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
                    {projectTree.map(project => (
                      <li key={project.id} className="flex items-center justify-between p-4 group hover:bg-muted/50">
                        <div className="flex items-center gap-4">
                            <Folder className="h-6 w-6 text-muted-foreground" />
                            <div style={{ marginLeft: `${project.level * 1.5}rem`}}>
                              <span className={cn("font-medium", project.level > 0 && "text-sm")}>{project.name}</span>
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
                  <p className="text-muted-foreground">You haven't added any businesses yet.</p>
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
