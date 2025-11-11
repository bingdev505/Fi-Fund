
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
import { PlusCircle, CalendarIcon } from 'lucide-react';
import type { Loan } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type RepaymentFormProps = {
  loan: Loan;
  outstandingAmount: number;
  onFinished: () => void;
};

const repaymentSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive'),
  account_id: z.string({ required_error: 'Please select an account.' }),
  date: z.date(),
});

export default function RepaymentForm({ loan, outstandingAmount, onFinished }: RepaymentFormProps) {
  const { addRepayment, currency, bankAccounts, contacts } = useFinancials();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof repaymentSchema>>({
    resolver: zodResolver(repaymentSchema),
    defaultValues: {
      amount: outstandingAmount,
      account_id: bankAccounts.find(acc => acc.is_primary)?.id || bankAccounts[0]?.id,
      date: new Date(),
    },
  });
  
  const watchedAmount = form.watch('amount');

  async function onSubmit(values: z.infer<typeof repaymentSchema>) {
    if (values.amount > outstandingAmount) {
        form.setError('amount', { message: 'Repayment cannot exceed outstanding amount.'});
        return;
    }

    try {
        const contactName = contacts.find(c => c.id === loan.contact_id)?.name || 'Unknown';
        await addRepayment(loan, values.amount, values.account_id, values.date);
        toast({
            title: 'Repayment Logged',
            description: `A repayment of ${formatCurrency(values.amount)} has been logged for the loan to/from ${contactName}.`
        })
        onFinished();
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Failed to log repayment',
            description: error.message
        })
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
  };
  
  const contactName = contacts.find(c => c.id === loan.contact_id)?.name || 'Unknown Contact';

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="p-4 border rounded-md bg-muted/50">
            <p className="text-sm text-muted-foreground">Loan to/from: <span className='font-medium text-foreground'>{contactName}</span></p>
            <p className="text-sm text-muted-foreground">Outstanding Amount: <span className='font-medium text-foreground'>{formatCurrency(outstandingAmount)}</span></p>
        </div>
        <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
            <FormItem>
                <FormLabel>Repayment Amount</FormLabel>
                <FormControl>
                <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
            </FormItem>
            )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="account_id"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>
                        {loan.type === 'loanGiven' ? 'Repay To Account' : 'Repay From Account'}
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
                                {acc.name}
                            </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            variant={'outline'}
                            className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                            )}
                            >
                            {field.value ? (
                                format(field.value, 'PPP')
                            ) : (
                                <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                    </FormItem>
                )}
             />
        </div>
         {Number(watchedAmount).toFixed(2) === outstandingAmount.toFixed(2) && outstandingAmount > 0 && (
            <div className="text-sm p-3 rounded-md bg-blue-50 border border-blue-200 text-blue-800">
                This will mark the loan as fully paid.
            </div>
        )}
        <Button type="submit" className="w-full">
            <PlusCircle className="mr-2 h-4 w-4" />
            Log Repayment
        </Button>
      </form>
    </Form>
  );
}
