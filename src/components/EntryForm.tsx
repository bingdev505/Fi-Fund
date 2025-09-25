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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useFinancials } from '@/hooks/useFinancials';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const formSchema = z.object({
  entryType: z.enum(['expense', 'income', 'creditor', 'debtor']),
  amount: z.coerce.number().positive('Amount must be positive'),
  category: z.string().min(1, 'Please select a category'),
  name: z.string().optional(), // For debts
  description: z.string().min(3, 'Description must be at least 3 characters'),
  dueDate: z.date().optional(),
});

export default function EntryForm() {
  const { addTransaction, addDebt, currency } = useFinancials();
  const { toast } = useToast();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
  }

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      entryType: 'expense',
      amount: 0,
      category: '',
      description: '',
    },
  });

  const entryType = form.watch('entryType');

  const categories =
    entryType === 'income'
      ? INCOME_CATEGORIES
      : entryType === 'expense'
      ? EXPENSE_CATEGORIES
      : [];

  function onSubmit(values: z.infer<typeof formSchema>) {
    const { entryType, ...data } = values;
    if (entryType === 'income' || entryType === 'expense') {
      addTransaction({
        type: entryType,
        amount: data.amount,
        category: data.category,
        description: data.description,
      });
      toast({
        title: `${entryType.charAt(0).toUpperCase() + entryType.slice(1)} added`,
        description: `${formatCurrency(data.amount)} for ${data.description} has been logged.`,
      });
    } else {
      addDebt({
        type: entryType,
        amount: data.amount,
        name: data.category, // Using category as name for debts
        description: data.description,
        dueDate: data.dueDate,
      });
      toast({
        title: `${entryType.charAt(0).toUpperCase() + entryType.slice(1)} added`,
        description: `Debt related to ${data.category} for ${formatCurrency(data.amount)} has been logged.`,
      });
    }
    form.reset({
      entryType: 'expense',
      amount: 0,
      category: '',
      description: '',
      dueDate: undefined,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="entryType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Entry Type</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    form.setValue('category', '');
                  }}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an entry type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="creditor">You Owe (Creditor)</SelectItem>
                    <SelectItem value="debtor">Owed to You (Debtor)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount ({currency})</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g. 1500" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {entryType === 'income' || entryType === 'expense' ? (
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  key={entryType}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <FormField
            control={form.control}
            name="category" // Using category field for name
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {entryType === 'creditor' ? 'Creditor Name' : 'Debtor Name'}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={
                      entryType === 'creditor'
                        ? 'e.g. Landlord'
                        : 'e.g. John Doe'
                    }
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

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

        {(entryType === 'creditor' || entryType === 'debtor') && (
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Due Date (Optional)</FormLabel>
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
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Button type="submit" className="w-full">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Entry
        </Button>
      </form>
    </Form>
  );
}
