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
import type { Debt } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

type RepaymentFormProps = {
  debt: Debt;
  onFinished: () => void;
};

export default function RepaymentForm({ debt, onFinished }: RepaymentFormProps) {
  const { addRepayment, currency, bankAccounts } = useFinancials();
  const { toast } = useToast();

  const formSchema = z.object({
    amount: z.coerce
      .number()
      .positive('Amount must be positive')
      .max(debt.amount, `Cannot pay more than the outstanding amount of ${formatCurrency(debt.amount)}`),
    account_id: z.string({ required_error: "Please select a bank account." }),
  });
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: debt.amount,
      account_id: bankAccounts.find(acc => acc.is_primary)?.id,
    },
  });

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
  }

  function onSubmit(values: z.infer<typeof formSchema>) {
    addRepayment(debt, values.amount, values.account_id);
    toast({
      title: 'Repayment Logged',
      description: `${formatCurrency(values.amount)} has been logged for ${debt.name}.`,
    });
    onFinished();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div>
            <h3 className="text-lg font-medium">{debt.name}</h3>
            <p className="text-sm text-muted-foreground">
                Outstanding: {formatCurrency(debt.amount)}
            </p>
        </div>
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Repayment Amount ({currency})</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
            control={form.control}
            name="account_id"
            render={({ field }) => (
            <FormItem>
                <FormLabel>
                    {debt.type === 'creditor' ? 'Pay From Account' : 'Receive Into Account'}
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                    <SelectTrigger>
                    <SelectValue placeholder="Select an account" />
                    </SelectTrigger>
                </FormControl>
                <SelectContent>
                    {bankAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                        {acc.name} ({formatCurrency(acc.balance)})
                    </SelectItem>
                    ))}
                </SelectContent>
                </Select>
                <FormMessage />
            </FormItem>
            )}
        />
        <Button type="submit" className="w-full">
          Log Repayment
        </Button>
      </form>
    </Form>
  );
}
