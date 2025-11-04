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
  type: z.enum(['expense', 'income', 'creditor', 'debtor']),
  amount: z.coerce.number().positive('Amount must be positive'),
  category: z.string().optional(),
  name: z.string().optional(), // For debts
  description: z.string().optional(),
  due_date: z.date().optional(),
  account_id: z.string().optional(),
  project_id: z.string().optional(),
}).refine(data => {
    if ((data.type === 'income' || data.type === 'expense' || data.type === 'creditor' || data.type === 'debtor') && !data.account_id) {
        return false;
    }
    return true;
}, {
    message: "Please select a bank account.",
    path: ["account_id"],
})
.refine(data => {
  if ((data.type === 'income' || data.type === 'expense') && !data.category) {
      return false;
  }
  return true;
}, {
  message: "Please select a category.",
  path: ["category"],
})
.refine(data => {
    if ((data.type === 'creditor' || data.type === 'debtor') && !data.category) {
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
  const { updateTransaction, updateDebt, currency, bankAccounts, categories: customCategories, clients, projects } = useFinancials();
  const { toast } = useToast();
  
  const isTransaction = 'category' in entry;
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: entry.type as 'expense' | 'income' | 'creditor' | 'debtor',
      amount: entry.amount,
      description: entry.description || '',
      category: isTransaction ? (entry as Transaction).category : (entry as Debt).name,
      account_id: entry.account_id,
      due_date: (entry as Debt).due_date ? parseISO((entry as Debt).due_date) : undefined,
      project_id: entry.project_id || 'personal',
    },
  });

  const watchedType = form.watch('type');

  const categories = useMemo(() => {
    const baseCategories = watchedType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const projectCategories = customCategories.filter(c => c.type === watchedType).map(c => c.name);
    return [...baseCategories, ...projectCategories];
  }, [watchedType, customCategories]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    const { category, ...data } = values;
    const finalData = {
        ...data,
        project_id: data.project_id === 'personal' ? undefined : data.project_id,
    };
    
    let updatedEntry;
    if (isTransaction) {
      const finalTransaction = { ...entry, ...finalData, category, description: data.description || '' } as Transaction;
      updateTransaction(entry as Transaction, finalTransaction);
      updatedEntry = finalTransaction;
      toast({ title: "Transaction Updated" });
    } else {
      const finalDebt = { ...entry, ...finalData, name: category, due_date: data.due_date?.toISOString(), description: data.description || '' } as Debt;
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
                name="type"
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

        {(watchedType === 'income' || watchedType === 'expense') && (
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
                    key={entry.type}
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
                name="account_id"
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

        {(watchedType === 'creditor' || watchedType === 'debtor') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="category" // Using category field for name
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>
                        {watchedType === 'creditor' ? "Lender's Name (Creditor)" : "Borrower's Name (Debtor)"}
                        </FormLabel>
                        <FormControl>
                        <Input
                            placeholder={
                            watchedType === 'creditor'
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
                    name="account_id"
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
            name="project_id"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Business (Optional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || 'personal'}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Personal / No Business" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="personal">Personal</SelectItem>
                    {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                        {p.name}
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

        {(watchedType === 'creditor' || watchedType === 'debtor') && (
          <FormField
            control={form.control}
            name="due_date"
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
