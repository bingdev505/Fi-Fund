'use client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useFinancials } from '@/hooks/useFinancials';
import { Loader2, User, PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import type { Client } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import ClientForm from './ClientForm';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';

export default function ClientsView() {
  const { isLoading, clients, deleteClient } = useFinancials();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);

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

  return (
    <Dialog open={formOpen} onOpenChange={(open) => {
      setFormOpen(open);
      if (!open) setEditingClient(null);
    }}>
      <AlertDialog>
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Manage Clients</CardTitle>
                <CardDescription>Add or manage your clients for the active business.</CardDescription>
              </div>
              <Button onClick={handleAddClick}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Client
              </Button>
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
