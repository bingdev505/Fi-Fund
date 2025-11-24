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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFinancials } from '@/hooks/useFinancials';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Save, Loader2, CalendarIcon } from 'lucide-react';
import type { Investment } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

const investmentSchema = z.object({
  name: z.string().min(2, 'Investment name must be at least 2 characters'),
  investment_type: z.string().min(2, 'Investment type is required'),
  amount: z.coerce.number().positive('Amount must be a positive number'),
  current_value: z.coerce.number().min(0, 'Current value cannot be negative').optional(),
  date: z.date(),
  account_id: z.string({ required_error: 'Please select an account' }),
  broker_name: z.string().optional(),
});

type InvestmentFormProps = {
    investment?: Investment | null;
    onFinished: () => void;
}

export default function InvestmentForm({ investment, onFinished }: InvestmentFormProps) {
  const { addInvestment, updateInvestment, bankAccounts, currency } = useFinancials();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof investmentSchema>>({
    resolver: zodResolver(investmentSchema),
    defaultValues: investment ? {
      ...investment,
      date: parseISO(investment.date),
    } : {
      name: '',
      investment_type: '',
      amount: '' as any,
      current_value: '' as any,
      date: new Date(),
      account_id: bankAccounts.find(acc => acc.is_primary)?.id,
      broker_name: '',
    },
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(values: z.infer<typeof investmentSchema>) {
    const finalValues = {
        ...values,
        current_value: values.current_value || values.amount,
        date: values.date.toISOString(),
    };

    if (investment) {
        await updateInvestment(investment.id, finalValues);
        toast({ title: 'Investment Updated' });
    } else {
        await addInvestment(finalValues);
        toast({
          title: 'Investment Added',
          description: `Investment "${values.name}" has been created.`,
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
                <FormLabel>Investment Name</FormLabel>
                <FormControl>
                    <Input placeholder="e.g. Apple Stock" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="investment_type"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Type</FormLabel>
                <FormControl>
                    <Input placeholder="e.g. Stocks, Real Estate" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Amount Invested ({currency})</FormLabel>
                <FormControl>
                    <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
             <FormField
            control={form.control}
            name="current_value"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Current Value ({currency}) (Optional)</FormLabel>
                <FormControl>
                    <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
                <FormItem className="flex flex-col">
                <FormLabel>Investment Date</FormLabel>
                <Popover>
                    <PopoverTrigger asChild>
                    <FormControl>
                        <Button
                        variant={'outline'}
                        className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                        >
                        {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                    </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                </Popover>
                <FormMessage />
                </FormItem>
            )}
        />
        <FormField
            control={form.control}
            name="account_id"
            render={({ field }) => (
            <FormItem>
                <FormLabel>Account Used</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                    <SelectTrigger>
                    <SelectValue placeholder="Select an account" />
                    </SelectTrigger>
                </FormControl>
                <SelectContent>
                    {bankAccounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                    ))}
                </SelectContent>
                </Select>
                <FormMessage />
            </FormItem>
            )}
        />
        <FormField
            control={form.control}
            name="broker_name"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Broker Name (Optional)</FormLabel>
                <FormControl>
                    <Input placeholder="e.g. Zerodha, Robinhood" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : investment ? (
              <Save className="mr-2 h-4 w-4" />
            ) : (
              <PlusCircle className="mr-2 h-4 w-4" />
            )}
            {isSubmitting ? 'Saving...' : investment ? 'Save Changes' : 'Add Investment'}
        </Button>
      </form>
    </Form>
  );
}
