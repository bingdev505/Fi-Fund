'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useFinancials } from '@/hooks/useFinancials';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Save } from 'lucide-react';
import type { Client } from '@/lib/types';

const clientSchema = z.object({
  name: z.string().min(2, 'Client name must be at least 2 characters'),
});

type ClientFormProps = {
  client?: Client | null;
  onFinished: () => void;
};

export default function ClientForm({ client, onFinished }: ClientFormProps) {
  const { addClient, updateClient } = useFinancials();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof clientSchema>>({
    resolver: zodResolver(clientSchema),
    defaultValues: client ? { name: client.name } : { name: '' },
  });

  async function onSubmit(values: z.infer<typeof clientSchema>) {
    if (client) {
        await updateClient(client.id, values);
        toast({ title: 'Client Updated' });
    } else {
        await addClient(values);
        toast({
            title: 'Client Added',
            description: `Client "${values.name}" has been created.`,
        });
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
              <FormLabel>Client Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
            {client ? <Save className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            {client ? 'Save Changes' : 'Add Client'}
        </Button>
      </form>
    </Form>
  );
}
