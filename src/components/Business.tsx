'use client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useFinancials } from '@/hooks/useFinancials';
import { Loader2, Folder, Pencil, Trash2, PlusCircle, Users, Tag, Landmark, Handshake, Contact, ArrowRightLeft, Link } from 'lucide-react';
import ProjectForm from './ProjectForm';
import { Button } from './ui/button';
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import type { Project } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Separator } from './ui/separator';
import GoogleSheetConnect from './GoogleSheetConnect';

export default function Business() {
  const { isLoading, projects, deleteProject, currency, allTransactions, allLoans, setActiveProject, user } = useFinancials();
  const { toast } = useToast();
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [connectSheetProject, setConnectSheetProject] = useState<Project | null>(null);

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
  
  const handleIconNavigation = (project: Project, path: string) => {
    setActiveProject(project);
    router.push(path);
  }
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
  };

  const { projectTree, projectBalances } = useMemo(() => {
    if (!projects || !allTransactions || !allLoans) {
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
        } else if (t.type === 'repayment') {
            const relatedLoan = allLoans.find(l => l.id === t.loan_id);
            if (relatedLoan?.type === 'loanGiven') {
                currentBalance += t.amount; // Money coming back in
            } else if (relatedLoan?.type === 'loanTaken') {
                currentBalance -= t.amount; // Money going out
            }
        }
        balances.set(t.project_id, currentBalance);
      }
    });

    allLoans.forEach(l => {
      if (l.project_id && balances.has(l.project_id)) {
        let currentBalance = balances.get(l.project_id) || 0;
        if (l.type === 'loanTaken') { // Money came in
          currentBalance += l.amount;
        } else if (l.type === 'loanGiven') { // Money went out
          currentBalance -= l.amount;
        }
        balances.set(l.project_id, currentBalance);
      }
    });

    const tree: (Project & { children: Project[], level: number })[] = [];
    const projectMap = new Map(projects.map(p => [p.id, { ...p, children: [], level: 0 }]));

    projects.forEach(p => {
      if (p.parent_project_id && projectMap.has(p.parent_project_id)) {
        const parentNode = projectMap.get(p.parent_project_id)!;
        parentNode.children.push(projectMap.get(p.id)!);
        projectMap.get(p.id)!.level = parentNode.level + 1;
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

  }, [projects, allTransactions, allLoans]);


  return (
    <Dialog open={formOpen} onOpenChange={(open) => {
      setFormOpen(open);
      if (!open) setEditingProject(null);
    }}>
      <AlertDialog>
        <Dialog open={!!connectSheetProject} onOpenChange={(open) => { if (!open) setConnectSheetProject(null)}}>
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <CardTitle>Manage Businesses</CardTitle>
                <CardDescription>Add or manage your businesses (projects).</CardDescription>
              </div>
              <Button onClick={handleAddClick} className="w-full md:w-auto">
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
                      <li key={project.id} className="p-4 group hover:bg-muted/50">
                        <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
                          <div className="flex items-center gap-4">
                              <Folder className="h-6 w-6 text-muted-foreground" />
                              <div style={{ marginLeft: `${project.level * 1.5}rem`}}>
                                <span className={cn("font-medium", project.level > 0 && "text-sm")}>{project.name}</span>
                              </div>
                          </div>
                          <div className="font-semibold text-left md:text-right">
                              {formatCurrency(projectBalances.get(project.id) || 0)}
                          </div>
                          <div className="grid grid-cols-5 md:flex md:flex-wrap items-center bg-background rounded-md border p-1 md:p-0 md:border-0 md:bg-transparent md:ml-2">
                            <Button variant="ghost" size="icon" onClick={() => handleIconNavigation(project, '/business/transactions')}>
                              <ArrowRightLeft className="h-4 w-4" />
                            </Button>
                             <Button variant="ghost" size="icon" onClick={() => handleIconNavigation(project, '/business/contacts')}>
                              <Contact className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleIconNavigation(project, '/business/clients')}>
                              <Users className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleIconNavigation(project, '/business/categories')}>
                              <Tag className="h-4 w-4" />
                            </Button>
                             <Button variant="ghost" size="icon" onClick={() => handleIconNavigation(project, '/business/accounts')}>
                              <Landmark className="h-4 w-4" />
                            </Button>
                             <Button variant="ghost" size="icon" onClick={() => handleIconNavigation(project, '/business/loans')}>
                              <Handshake className="h-4 w-4" />
                            </Button>
                             <Button variant="ghost" size="icon" onClick={() => setConnectSheetProject(project)} title="Connect Google Sheet">
                                <Link className="h-4 w-4" />
                            </Button>
                            <div className='hidden md:block'>
                                <Separator orientation="vertical" className="h-6 mx-1" />
                            </div>
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
              This action cannot be undone. This will permanently delete this business and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingProject(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
        {connectSheetProject && (
          <DialogContent>
            <DialogHeader>
                <DialogTitle>Connect Google Sheet to '{connectSheetProject.name}'</DialogTitle>
                <DialogDescription>
                    Connect a Google Sheet to automatically sync your financial data.
                </DialogDescription>
            </DialogHeader>
            <GoogleSheetConnect project={connectSheetProject} onFinished={() => setConnectSheetProject(null)} />
          </DialogContent>
        )}
        </Dialog>
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
