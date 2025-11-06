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
import type { Transaction, Loan } from '@/lib/types';
import { useMemo } from 'react';

const formSchema = z.object({
  type: z.enum(['expense', 'income', 'loanGiven', 'loanTaken']),
  amount: z.coerce.number().positive('Amount must be positive'),
  category: z.string().optional(),
  description: z.string().optional(),
  contact_id: z.string().optional(),
  due_date: z.date().optional(),
  status: z.enum(['active', 'paid']).optional(),
  account_id: z.string().optional(),
  project_id: z.string().optional(),
}).refine(data => {
    if ((data.type === 'income' || data.type === 'expense' || data.type === 'loanGiven' || data.type === 'loanTaken') && !data.account_id) {
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
    if ((data.type === 'loanGiven' || data.type === 'loanTaken') && !data.contact_id) {
        return false;
    }
    return true;
  }, {
    message: "Please provide a contact.",
    path: ["contact_id"],
});

type EditEntryFormProps = {
    entry: Transaction | Loan;
    onFinished: (updatedEntry: Transaction | Loan) => void;
}

export default function EditEntryForm({ entry, onFinished }: EditEntryFormProps) {
  const { updateTransaction, updateLoan, currency, bankAccounts, categories: customCategories, contacts, projects } = useFinancials();
  const { toast } = useToast();
  
  const isTransaction = 'category' in entry;
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: isTransaction ? {
      type: (entry as Transaction).type as 'expense' | 'income',
      amount: entry.amount,
      description: entry.description || '',
      category: (entry as Transaction).category,
      account_id: (entry as Transaction).account_id,
      project_id: (entry as Transaction).project_id,
    } : {
      type: (entry as Loan).type as 'loanGiven' | 'loanTaken',
      amount: entry.amount,
      description: entry.description || '',
      contact_id: (entry as Loan).contact_id,
      account_id: (entry as Loan).account_id,
      due_date: (entry as Loan).due_date ? parseISO((entry as Loan).due_date!) : undefined,
      status: (entry as Loan).status,
      project_id: (entry as Loan).project_id,
    },
  });

  const watchedType = form.watch('type');

  const categories = useMemo(() => {
    const baseCategories = watchedType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const projectCategories = customCategories.filter(c => c.type === watchedType).map(c => c.name);
    return [...baseCategories, ...projectCategories];
  }, [watchedType, customCategories]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    const { ...data } = values;
    
    let updatedEntry;
    if (isTransaction) {
      const finalTransaction = { ...entry, ...data, description: data.description || '' } as Transaction;
      updateTransaction(finalTransaction.id, finalTransaction);
      updatedEntry = finalTransaction;
      toast({ title: "Transaction Updated" });
    } else {
      const finalLoan = { ...entry, ...data, due_date: data.due_date?.toISOString(), description: data.description || '' } as Loan;
      updateLoan((entry as Loan).id, finalLoan);
      updatedEntry = finalLoan;
      toast({ title: "Loan Updated" });
    }
    onFinished(updatedEntry);
  }

  // Transfers cannot be edited from this form
  if (entry.type === 'transfer') {
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
                        <SelectItem value="loanGiven">Loan Given</SelectItem>
                        <SelectItem value="loanTaken">Loan Taken</SelectItem>
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

        {(watchedType === 'loanGiven' || watchedType === 'loanTaken') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="contact_id"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>
                        {watchedType === 'loanTaken' ? "Lender's Name" : "Borrower's Name"}
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Select a contact" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {contacts.map((contact) => (
                                <SelectItem key={contact.id} value={contact.id}>
                                    {contact.name}
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
        
        <FormField
            control={form.control}
            name="project_id"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Business (Optional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a Business" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
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

        {(watchedType === 'loanGiven' || watchedType === 'loanTaken') && (
          <>
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
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
              <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                      <SelectTrigger>
                      <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                  </Select>
                  <FormMessage />
              </FormItem>
              )}
            />
          </>
        )}

        <Button type="submit" className="w-full">
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </form>
    </Form>
  );
}
