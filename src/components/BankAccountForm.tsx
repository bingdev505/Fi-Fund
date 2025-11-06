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
import type { BankAccount } from '@/lib/types';
import { PlusCircle, Save } from 'lucide-react';

const bankAccountSchema = z.object({
  name: z.string().min(2, 'Bank name must be at least 2 characters'),
  balance: z.coerce.number().min(0, 'Balance cannot be negative'),
});

type BankAccountFormProps = {
  account?: BankAccount | null;
  onFinished: () => void;
};

export default function BankAccountForm({ account, onFinished }: BankAccountFormProps) {
  const { addBankAccount, updateBankAccount, currency, activeProject } = useFinancials();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof bankAccountSchema>>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: account ? {
      name: account.name,
      balance: account.balance,
    } : {
      name: '',
      balance: 0,
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
  };

  function onSubmit(values: z.infer<typeof bankAccountSchema>) {
    if (account) {
      updateBankAccount(account.id, values);
      toast({
        title: 'Bank Account Updated',
        description: `${values.name} has been updated.`,
      });
    } else {
      addBankAccount(values, activeProject?.id);
      toast({
        title: 'Bank Account Added',
        description: `${values.name} with a balance of ${formatCurrency(values.balance)} has been added.`,
      });
    }
    onFinished();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bank Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. My Savings Account" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="balance"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Balance ({currency})</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g. 50000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" className="w-full">
          {account ? <Save className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
          {account ? 'Save Changes' : 'Add Account'}
        </Button>
      </form>
    </Form>
  );
}
