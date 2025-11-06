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
import { useMemo, useEffect } from 'react';
import { Combobox } from './ui/combobox';

const formSchema = z.object({
  entryType: z.enum(['expense', 'income', 'transfer', 'loanGiven', 'loanTaken']),
  amount: z.coerce.number().positive('Amount must be positive'),
  category: z.string().optional(),
  contact_id: z.string().optional(),
  description: z.string().optional(),
  due_date: z.date().optional(),
  account_id: z.string().optional(), // for income/expense/debts
  from_account_id: z.string().optional(), // for transfer
  to_account_id: z.string().optional(), // for transfer
  project_id: z.string().optional(),
}).refine(data => {
    if ((data.entryType === 'income' || data.entryType === 'expense' || data.entryType === 'loanGiven' || data.entryType === 'loanTaken') && !data.account_id) {
        return false;
    }
    return true;
}, {
    message: "Please select a bank account.",
    path: ["account_id"],
}).refine(data => {
    if (data.entryType === 'transfer' && (!data.from_account_id || !data.to_account_id)) {
        return false;
    }
    return true;
}, {
    message: "Please select both from and to accounts for transfer.",
    path: ["from_account_id"],
}).refine(data => {
    if (data.entryType === 'transfer' && data.from_account_id === data.to_account_id) {
        return false;
    }
    return true;
}, {
    message: "From and To accounts cannot be the same.",
    path: ["to_account_id"],
})
.refine(data => {
  if ((data.entryType === 'income' || data.entryType === 'expense') && !data.category) {
      return false;
  }
  return true;
}, {
  message: "Please provide a category.",
  path: ["category"],
})
.refine(data => {
    if ((data.entryType === 'loanGiven' || data.entryType === 'loanTaken') && !data.contact_id) {
        return false;
    }
    return true;
  }, {
    message: "Please provide a contact.",
    path: ["contact_id"],
});

type EntryFormProps = {
  onFinished: () => void;
};


export default function EntryForm({ onFinished }: EntryFormProps) {
  const { 
    addTransaction, 
    addLoan, 
    currency, 
    allBankAccounts, 
    clients, 
    categories: customCategories, 
    addClient, 
    addCategory,
    projects,
    activeProject
  } = useFinancials();
  const { toast } = useToast();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
  }

  const personalProject = useMemo(() => projects.find(p => p.name === 'Personal'), [projects]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      entryType: 'expense',
      amount: '' as any,
      description: '',
      category: '',
      contact_id: '',
      account_id: allBankAccounts.find(acc => acc.is_primary)?.id,
      from_account_id: undefined,
      to_account_id: undefined,
      due_date: undefined,
      project_id: activeProject && activeProject.id !== 'all' ? activeProject.id : personalProject?.id,
    },
  });

  const entryType = form.watch('entryType');
  const selectedProjectId = form.watch('project_id');

  const filteredClients = useMemo(() => {
    const projectId = selectedProjectId;
    if (!projectId) return clients.filter(c => c.project_id === personalProject?.id);
    return clients.filter(c => c.project_id === projectId);
  }, [clients, selectedProjectId, personalProject]);
  
  const filteredBankAccounts = useMemo(() => {
    const projectId = selectedProjectId;
    if (!projectId) return allBankAccounts.filter(acc => acc.project_id === personalProject?.id || !acc.project_id);
    return allBankAccounts.filter(acc => acc.project_id === projectId);
  }, [allBankAccounts, selectedProjectId, personalProject]);


  const filteredCategories = useMemo(() => {
    const projectId = selectedProjectId;
    const baseCategories = entryType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    
    let projectCategories: string[] = [];
    if (projectId) {
       projectCategories = customCategories
        .filter(c => c.type === entryType && c.project_id === projectId)
        .map(c => c.name);
    } else {
        projectCategories = customCategories
        .filter(c => c.type === entryType && (c.project_id === personalProject?.id || !c.project_id))
        .map(c => c.name);
    }

    return [...new Set([...baseCategories, ...projectCategories])];
  }, [entryType, customCategories, selectedProjectId, personalProject]);
  
   useEffect(() => {
    const personalProj = projects.find(p => p.name === 'Personal');
    form.setValue('project_id', activeProject && activeProject.id !== 'all' ? activeProject.id : personalProj?.id);
  }, [activeProject, form, projects]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    const { entryType, ...data } = values;

    const project_id = data.project_id;

    let finalContactId: string | undefined = data.contact_id;

    // Handle client creation/selection for all types that use clientName
    if (data.contact_id && (entryType === 'loanGiven' || entryType === 'loanTaken')) {
        let client = clients.find(c => c.id.toLowerCase() === data.contact_id!.toLowerCase() && ((!c.project_id && project_id === personalProject?.id) || c.project_id === project_id));
        if (!client) {
            client = await addClient({ name: data.contact_id! }, project_id);
        }
        finalContactId = client.id;
    }

    if (entryType === 'income' || entryType === 'expense' || entryType === 'transfer') {
      
      // Auto-create category if it's new
      if (data.category && !filteredCategories.includes(data.category) && (entryType === 'income' || entryType === 'expense')) {
        await addCategory({ name: data.category, type: entryType as 'income' | 'expense' }, project_id);
      }

      await addTransaction({
        type: entryType as 'income' | 'expense' | 'transfer',
        amount: data.amount,
        category: entryType === 'transfer' ? 'Bank Transfer' : data.category!,
        description: data.description!,
        account_id: data.account_id,
        from_account_id: data.from_account_id,
        to_account_id: data.to_account_id,
        client_id: data.contact_id,
        project_id: project_id,
      });
      toast({
        title: `${entryType.charAt(0).toUpperCase() + entryType.slice(1)} added`,
        description: `${formatCurrency(data.amount)} has been logged.`,
      });
    } else { // loanGiven or loanTaken
      if (!finalContactId) {
        toast({ variant: 'destructive', title: 'Contact is required for loans.' });
        return;
      }
      
      await addLoan({
        type: entryType,
        amount: data.amount,
        contact_id: finalContactId,
        description: data.description!,
        due_date: data.due_date?.toISOString(),
        status: 'active',
        account_id: data.account_id!,
        project_id: project_id,
      });
      toast({
        title: `${entryType === 'loanTaken' ? 'Loan Taken' : 'Loan Given'} added`,
        description: `Loan related to ${clients.find(c => c.id === finalContactId)?.name || finalContactId} for ${formatCurrency(data.amount)} has been logged.`,
      });
    }
    form.reset();
    onFinished();
  }

  const clientOptions = useMemo(() => filteredClients.map(c => ({ value: c.id, label: c.name })), [filteredClients]);
  const categoryOptions = useMemo(() => filteredCategories.map(c => ({ value: c, label: c })), [filteredCategories]);

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
                <Select onValueChange={(value) => {
                    field.onChange(value);
                    form.reset({
                      ...form.getValues(),
                      entryType: value as any,
                      category: '',
                      contact_id: '',
                      account_id: allBankAccounts.find(acc => acc.is_primary)?.id,
                      from_account_id: undefined,
                      to_account_id: undefined,
                    });
                }} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="transfer">Bank Transfer</SelectItem>
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
              name="project_id"
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>Business</FormLabel>
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
        </div>
        
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

        {entryType === 'transfer' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="from_account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From Account</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredBankAccounts.map((acc) => (
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
              name="to_account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To Account</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredBankAccounts.map((acc) => (
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
        ) : (entryType === 'income' || entryType === 'expense') ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Category</FormLabel>
                  <Combobox
                      options={categoryOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Category"
                      searchPlaceholder="Search categories..."
                      noResultsText="No categories found."
                  />
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
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                  <FormControl>
                      <SelectTrigger>
                      <SelectValue placeholder="Select an account" />
                      </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                      {filteredBankAccounts.map((acc) => (
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
        ) : (entryType === 'loanGiven' || entryType === 'loanTaken') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="contact_id"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                          <FormLabel>
                            {entryType === 'loanTaken' ? "Lender's Name" : "Borrower's Name"}
                          </FormLabel>
                          <Combobox
                            options={clientOptions}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Contact"
                            searchPlaceholder="Search contacts..."
                            noResultsText="No contacts found."
                          />
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
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Select an account" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {filteredBankAccounts.map((acc) => (
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
        
        {entryType !== 'transfer' && (
          <div className='space-y-6'>
            {(entryType === 'income' || entryType === 'expense') && (
              <FormField
                control={form.control}
                name="contact_id"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Client (Optional)</FormLabel>
                        <Combobox
                            options={clientOptions}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Client"
                            searchPlaceholder="Search clients..."
                            noResultsText="No clients found."
                        />
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
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g. Lunch with colleagues" {...field} value={field.value || ''}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(entryType === 'loanGiven' || entryType === 'loanTaken') && (
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
          </div>
        )}

        <Button type="submit" className="w-full" disabled={allBankAccounts.length === 0}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Entry
        </Button>
        {allBankAccounts.length === 0 && (
            <p className="text-sm text-destructive text-center">Please add a bank account in Settings before adding entries.</p>
        )}
      </form>
    </Form>
  );
}
