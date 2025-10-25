'use client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useFinancials } from '@/hooks/useFinancials';
import { Loader2, User, PlusCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';

const clientSchema = z.object({
  name: z.string().min(2, 'Client name must be at least 2 characters'),
});

export default function ClientsView() {
  const { isLoading, clients, addClient } = useFinancials();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof clientSchema>>({
    resolver: zodResolver(clientSchema),
    defaultValues: { name: '' },
  });

  function onSubmit(values: z.infer<typeof clientSchema>) {
    addClient(values);
    toast({
      title: 'Client Added',
      description: `Client "${values.name}" has been created.`,
    });
    form.reset();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Clients</CardTitle>
        <CardDescription>Add or manage your clients for the active business.</CardDescription>
      </CardHeader>
      <CardContent>
        <div>
          <h3 className="text-lg font-medium mb-2">Add New Client</h3>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-end gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="flex-grow">
                    <FormLabel>Client Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Client
              </Button>
            </form>
          </Form>
        </div>
        <Separator className='my-6' />
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
                  <li key={client.id} className="flex items-center justify-between p-4 hover:bg-muted/50">
                    <div className="flex items-center gap-4">
                      <User className="h-6 w-6 text-muted-foreground" />
                      <div>
                        <span className="font-medium">{client.name}</span>
                      </div>
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
  );
}
