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
import type { Contact } from '@/lib/types';

const contactSchema = z.object({
  name: z.string().min(2, 'Contact name must be at least 2 characters'),
});

type ContactFormProps = {
  contact?: Contact | null;
  onFinished: () => void;
};

export default function ContactForm({ contact, onFinished }: ContactFormProps) {
  const { addContact, updateContact } = useFinancials();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof contactSchema>>({
    resolver: zodResolver(contactSchema),
    defaultValues: contact ? { name: contact.name } : { name: '' },
  });

  async function onSubmit(values: z.infer<typeof contactSchema>) {
    if (contact) {
        await updateContact(contact.id, values);
        toast({ title: 'Contact Updated' });
    } else {
        await addContact(values);
        toast({
            title: 'Contact Added',
            description: `Contact "${values.name}" has been created.`,
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
              <FormLabel>Contact Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
            {contact ? <Save className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            {contact ? 'Save Changes' : 'Add Contact'}
        </Button>
      </form>
    </Form>
  );
}
