'use client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useFinancials } from '@/hooks/useFinancials';
import { Loader2, PlusCircle, Heart, Pencil, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import type { Hobby } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';

const hobbySchema = z.object({
  name: z.string().min(2, 'Hobby name must be at least 2 characters'),
  description: z.string().optional(),
});

function HobbyForm({ hobby, onFinished }: { hobby?: Hobby | null, onFinished: () => void }) {
  const { addHobby, updateHobby } = useFinancials();
  const { toast } = useToast();
  const form = useForm<z.infer<typeof hobbySchema>>({
    resolver: zodResolver(hobbySchema),
    defaultValues: {
      name: hobby?.name || '',
      description: hobby?.description || '',
    },
  });

  function onSubmit(values: z.infer<typeof hobbySchema>) {
    if (hobby) {
      updateHobby(hobby.id, values);
      toast({ title: 'Hobby Updated' });
    } else {
      addHobby(values);
      toast({ title: 'Hobby Added' });
    }
    onFinished();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hobby Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Hiking" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g. Exploring trails and mountains." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          {hobby ? 'Save Changes' : 'Add Hobby'}
        </Button>
      </form>
    </Form>
  );
}

export default function Hobbies() {
  const { isLoading, hobbies, deleteHobby } = useFinancials();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editingHobby, setEditingHobby] = useState<Hobby | null>(null);
  const [deletingHobby, setDeletingHobby] = useState<Hobby | null>(null);

  const handleAddClick = () => {
    setEditingHobby(null);
    setFormOpen(true);
  };

  const handleEditClick = (hobby: Hobby) => {
    setEditingHobby(hobby);
    setFormOpen(true);
  };

  const handleDelete = () => {
    if (!deletingHobby) return;
    deleteHobby(deletingHobby.id);
    toast({ title: "Hobby Deleted" });
    setDeletingHobby(null);
  };

  return (
    <Dialog open={formOpen} onOpenChange={(open) => {
      setFormOpen(open);
      if (!open) setEditingHobby(null);
    }}>
      <AlertDialog>
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>My Hobbies</CardTitle>
                <CardDescription>Keep track of your hobbies and interests.</CardDescription>
              </div>
              <Button onClick={handleAddClick}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Hobby
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-24">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : hobbies.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {hobbies.map(hobby => (
                  <Card key={hobby.id} className="group">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="flex items-center gap-2">
                          <Heart className="h-5 w-5 text-red-500" />
                          {hobby.name}
                        </CardTitle>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                          <Button variant="ghost" size="icon" onClick={() => handleEditClick(hobby)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setDeletingHobby(hobby)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{hobby.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 border-dashed border-2 rounded-md">
                <p className="text-muted-foreground">You haven't added any hobbies yet.</p>
              </div>
            )}
          </CardContent>
        </Card>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this hobby.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingHobby(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingHobby ? 'Edit' : 'Add'} Hobby</DialogTitle>
        </DialogHeader>
        <HobbyForm hobby={editingHobby} onFinished={() => {
          setFormOpen(false);
          setEditingHobby(null);
        }}/>
      </DialogContent>
    </Dialog>
  );
}
