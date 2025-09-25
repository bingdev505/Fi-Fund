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
  entryType: z.enum(['expense', 'income', 'creditor', 'debtor', 'transfer']),
  amount: z.coerce.number().positive('Amount must be positive'),
  category: z.string().optional(), 
  name: z.string().optional(), // For debts
  description: z.string().min(3, 'Description must be at least 3 characters'),
  dueDate: z.date().optional(),
  accountId: z.string().optional(), // for income/expense/debts
  fromAccountId: z.string().optional(), // for transfer
  toAccountId: z.string().optional(), // for transfer
}).refine(data => {
    if ((data.entryType === 'income' || data.entryType === 'expense' || data.entryType === 'creditor' || data.entryType === 'debtor') && !data.accountId) {
        return false;
    }
    return true;
}, {
    message: "Please select a bank account.",
    path: ["accountId"],
}).refine(data => {
    if (data.entryType === 'transfer' && (!data.fromAccountId || !data.toAccountId)) {
        return false;
    }
    return true;
}, {
    message: "Please select both from and to accounts for transfer.",
    path: ["fromAccountId"],
}).refine(data => {
    if (data.entryType === 'transfer' && data.fromAccountId === data.toAccountId) {
        return false;
    }
    return true;
}, {
    message: "From and To accounts cannot be the same.",
    path: ["toAccountId"],
})
.refine(data => {
  if ((data.entryType === 'income' || data.entryType === 'expense') && !data.category) {
      return false;
  }
  return true;
}, {
  message: "Please select a category.",
  path: ["category"],
})
.refine(data => {
    if ((data.entryType === 'creditor' || data.entryType === 'debtor') && !data.category) { // name is stored in category field for debts
        return false;
    }
    return true;
  }, {
    message: "Please provide a name.",
    path: ["category"],
});

export default function EntryForm() {
  const { addTransaction, addDebt, currency, bankAccounts } = useFinancials();
  const { toast } = useToast();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
  }

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      entryType: 'expense',
      amount: 0,
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
    if (entryType === 'income' || entryType === 'expense' || entryType === 'transfer') {
      addTransaction({
        type: entryType,
        amount: data.amount,
        category: entryType === 'transfer' ? 'Bank Transfer' : data.category!,
        description: data.description,
        accountId: data.accountId,
        fromAccountId: data.fromAccountId,
        toAccountId: data.toAccountId
      });
      toast({
        title: `${entryType.charAt(0).toUpperCase() + entryType.slice(1)} added`,
        description: `${formatCurrency(data.amount)} has been logged.`,
      });
    } else { // creditor or debtor
      addDebt({
        type: entryType,
        amount: data.amount,
        name: data.category!, // Using category as name for debts
        description: data.description,
        dueDate: data.dueDate,
        accountId: data.accountId!,
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
      accountId: undefined,
      fromAccountId: undefined,
      toAccountId: undefined
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
                    form.setValue('accountId', undefined);
                    form.setValue('fromAccountId', undefined);
                    form.setValue('toAccountId', undefined);
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
                    <SelectItem value="transfer">Bank Transfer</SelectItem>
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

        {entryType === 'transfer' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="fromAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From Account</FormLabel>
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
              name="toAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To Account</FormLabel>
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
          </div>
        )}

        {(entryType === 'income' || entryType === 'expense') && (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
             <FormField
                control={form.control}
                name="accountId"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Account</FormLabel>
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
          </div>
        )}

        {(entryType === 'creditor' || entryType === 'debtor') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <FormField
                    control={form.control}
                    name="accountId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Account</FormLabel>
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
          </div>
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

        <Button type="submit" className="w-full" disabled={bankAccounts.length === 0}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Entry
        </Button>
        {bankAccounts.length === 0 && (
            <p className="text-sm text-destructive text-center">Please add a bank account in Settings before adding entries.</p>
        )}
      </form>
    </Form>
  );
}
