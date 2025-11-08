'use client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useFinancials } from '@/hooks/useFinancials';
import { Loader2, User, PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import type { Contact } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import ContactForm from './ContactForm';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';

export default function ContactsView() {
  const { isLoading, contacts, deleteContact } = useFinancials();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null);

  const handleAddClick = () => {
    setEditingContact(null);
    setFormOpen(true);
  };
  
  const handleEditClick = (contact: Contact) => {
    setEditingContact(contact);
    setFormOpen(true);
  };

  const handleDelete = () => {
    if (!deletingContact) return;
    deleteContact(deletingContact.id);
    toast({ title: "Contact Deleted" });
    setDeletingContact(null);
  };


  return (
    <Dialog open={formOpen} onOpenChange={(open) => {
      setFormOpen(open);
      if (!open) setEditingContact(null);
    }}>
      <AlertDialog>
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Manage Contacts</CardTitle>
                <CardDescription>Add or manage your contacts for personal loans.</CardDescription>
              </div>
              <Button onClick={handleAddClick}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Contact
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div>
              <h3 className="text-lg font-medium mb-4">Your Contacts</h3>
              {isLoading ? (
                <div className="flex justify-center items-center h-24">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : contacts.length > 0 ? (
                <div className="border rounded-md">
                  <ul className="divide-y divide-border">
                    {contacts.map(contact => (
                      <li key={contact.id} className="flex items-center justify-between p-4 group hover-mobile-bg-muted">
                        <div className="flex items-center gap-4">
                          <User className="h-6 w-6 text-muted-foreground" />
                          <div>
                            <span className="font-medium">{contact.name}</span>
                          </div>
                        </div>
                        <div className='flex items-center gap-4'>
                          <div className="group-hover-mobile-opacity flex items-center">
                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(contact)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => setDeletingContact(contact)}>
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
                  <p className="text-muted-foreground text-sm">You haven't added any contacts yet.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this contact.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeletingContact(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingContact ? 'Edit' : 'Add'} Contact</DialogTitle>
            </DialogHeader>
            <ContactForm contact={editingContact} onFinished={() => {
                setFormOpen(false);
                setEditingContact(null);
            }}/>
        </DialogContent>
    </Dialog>
  );
}
