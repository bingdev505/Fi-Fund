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
import { Textarea } from '@/components/ui/textarea';
import { useFinancials } from '@/hooks/useFinancials';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle } from 'lucide-react';

const formSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive'),
  category: z.string().min(1, 'Please select a category'),
  description: z.string().min(3, 'Description must be at least 3 characters'),
});

type TransactionFormProps = {
  type: 'income' | 'expense';
};

export default function TransactionForm({ type }: TransactionFormProps) {
  const { addTransaction } = useFinancials();
  const { toast } = useToast();
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      category: '',
      description: '',
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    addTransaction({ ...values, type });
    toast({
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} added`,
      description: `₹${values.amount} for ${values.description} has been logged.`,
    });
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount (INR)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g. 1500" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g. Lunch with colleagues" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add {type === 'income' ? 'Income' : 'Expense'}
        </Button>
      </form>
    </Form>
  );
}
