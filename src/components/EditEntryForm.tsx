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
import { Save, CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import type { Transaction, Debt } from '@/lib/types';
import { useMemo } from 'react';

const formSchema = z.object({
  entryType: z.enum(['expense', 'income', 'creditor', 'debtor']),
  amount: z.coerce.number().positive('Amount must be positive'),
  category: z.string().optional(),
  name: z.string().optional(), // For debts
  description: z.string().min(3, 'Description must be at least 3 characters'),
  dueDate: z.date().optional(),
  accountId: z.string().optional(),
}).refine(data => {
    if ((data.entryType === 'income' || data.entryType === 'expense' || data.entryType === 'creditor' || data.entryType === 'debtor') && !data.accountId) {
        return false;
    }
    return true;
}, {
    message: "Please select a bank account.",
    path: ["accountId"],
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
    if ((data.entryType === 'creditor' || data.entryType === 'debtor') && !data.category) {
        return false;
    }
    return true;
  }, {
    message: "Please provide a name.",
    path: ["category"],
});

type EditEntryFormProps = {
    entry: Transaction | Debt;
    onFinished: (updatedEntry: Transaction | Debt) => void;
}

export default function EditEntryForm({ entry, onFinished }: EditEntryFormProps) {
  const { updateTransaction, updateDebt, currency, bankAccounts, categories: customCategories, clients } = useFinancials();
  const { toast } = useToast();
  
  const isTransaction = 'category' in entry;
  const entryType = isTransaction ? (entry as Transaction).type : (entry as Debt).type;
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      entryType: entryType as 'expense' | 'income' | 'creditor' | 'debtor',
      amount: entry.amount,
      description: entry.description,
      category: isTransaction ? (entry as Transaction).category : (entry as Debt).name,
      accountId: entry.accountId,
      dueDate: (entry as Debt).dueDate ? parseISO((entry as Debt).dueDate!) : undefined
    },
  });

  const watchedEntryType = form.watch('entryType');

  const categories = useMemo(() => {
    const baseCategories = watchedEntryType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const projectCategories = customCategories.filter(c => c.type === watchedEntryType).map(c => c.name);
    return [...baseCategories, ...projectCategories];
  }, [watchedEntryType, customCategories]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    const { category, ...data } = values;
    
    let updatedEntry;
    if (isTransaction) {
      const finalTransaction = { ...entry, ...data, category } as Transaction;
      updateTransaction(entry as Transaction, finalTransaction);
      updatedEntry = finalTransaction;
      toast({ title: "Transaction Updated" });
    } else {
      const finalDebt = { ...entry, ...data, name: category, dueDate: data.dueDate?.toISOString() } as Debt;
      updateDebt(entry as Debt, finalDebt);
      updatedEntry = finalDebt;
      toast({ title: "Debt Updated" });
    }
    onFinished(updatedEntry);
  }

  // Transfers cannot be edited from this form
  if (entry.type === 'transfer' || entry.type === 'repayment') {
      return (
          <div className='text-center text-muted-foreground p-8'>
              <p>This entry type cannot be edited here.</p>
          </div>
      )
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
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="expense">Expense</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="creditor">I Owe (Loan Taken)</SelectItem>
                        <SelectItem value="debtor">They Owe (Loan Given)</SelectItem>
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
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {(watchedEntryType === 'income' || watchedEntryType === 'expense') && (
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

        {(watchedEntryType === 'creditor' || watchedEntryType === 'debtor') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="category" // Using category field for name
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>
                        {watchedEntryType === 'creditor' ? "Lender's Name (Creditor)" : "Borrower's Name (Debtor)"}
                        </FormLabel>
                        <FormControl>
                        <Input
                            placeholder={
                            watchedEntryType === 'creditor'
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

        {(watchedEntryType === 'creditor' || watchedEntryType === 'debtor') && (
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
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </form>
    </Form>
  );
}
