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

const formSchema = z.object({
  entryType: z.enum(['expense', 'income', 'creditor', 'debtor', 'transfer']),
  amount: z.coerce.number().positive('Amount must be positive'),
  category: z.string().optional(),
  clientName: z.string().optional(), // For debts OR for income/expense
  description: z.string().optional(),
  due_date: z.date().optional(),
  account_id: z.string().optional(), // for income/expense/debts
  from_account_id: z.string().optional(), // for transfer
  to_account_id: z.string().optional(), // for transfer
  project_id: z.string().optional(),
}).refine(data => {
    if ((data.entryType === 'income' || data.entryType === 'expense' || data.entryType === 'creditor' || data.entryType === 'debtor') && !data.account_id) {
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
    if ((data.entryType === 'creditor' || data.entryType === 'debtor') && !data.clientName) {
        return false;
    }
    return true;
  }, {
    message: "Please provide a name.",
    path: ["clientName"],
});

type EntryFormProps = {
  onFinished: () => void;
};


export default function EntryForm({ onFinished }: EntryFormProps) {
  const { 
    addTransaction, 
    addDebt, 
    currency, 
    bankAccounts, 
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      entryType: 'expense',
      amount: 0,
      description: '',
      category: '',
      clientName: '',
      account_id: bankAccounts.find(acc => acc.is_primary)?.id,
      from_account_id: undefined,
      to_account_id: undefined,
      due_date: undefined,
      project_id: activeProject && activeProject.id !== 'all' ? activeProject.id : 'personal',
    },
  });

  const entryType = form.watch('entryType');
  const selectedProjectId = form.watch('project_id');

  const filteredClients = useMemo(() => {
    const projectId = selectedProjectId === 'personal' ? undefined : selectedProjectId;
    if (!projectId) return clients.filter(c => !c.project_id);
    return clients.filter(c => c.project_id === projectId);
  }, [clients, selectedProjectId]);

  const filteredCategories = useMemo(() => {
    const projectId = selectedProjectId === 'personal' ? undefined : selectedProjectId;
    const baseCategories = entryType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const projectCategories = customCategories
        .filter(c => c.type === entryType && ((!projectId && !c.project_id) || c.project_id === projectId))
        .map(c => c.name);
    return [...new Set([...baseCategories, ...projectCategories])];
  }, [entryType, customCategories, selectedProjectId]);
  
   useEffect(() => {
    form.setValue('project_id', activeProject && activeProject.id !== 'all' ? activeProject.id : 'personal');
  }, [activeProject, form]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    const { entryType, ...data } = values;

    const project_id = data.project_id === 'personal' ? undefined : data.project_id;

    let finalClientId: string | undefined;

    // Handle client creation/selection for all types that use clientName
    if (data.clientName) {
        let client = clients.find(c => c.name.toLowerCase() === data.clientName!.toLowerCase() && ((!c.project_id && !project_id) || c.project_id === project_id));
        if (!client) {
            client = await addClient({ name: data.clientName! }, project_id);
        }
        finalClientId = client.id;
    }

    if (entryType === 'income' || entryType === 'expense' || entryType === 'transfer') {
      
      // Auto-create category if it's new
      if (data.category && !filteredCategories.includes(data.category) && (entryType === 'income' || entryType === 'expense')) {
        await addCategory({ name: data.category, type: entryType }, project_id);
      }

      await addTransaction({
        type: entryType,
        amount: data.amount,
        category: entryType === 'transfer' ? 'Bank Transfer' : data.category!,
        description: data.description!,
        account_id: data.account_id,
        from_account_id: data.from_account_id,
        to_account_id: data.to_account_id,
        client_id: finalClientId,
        project_id: project_id,
      });
      toast({
        title: `${entryType.charAt(0).toUpperCase() + entryType.slice(1)} added`,
        description: `${formatCurrency(data.amount)} has been logged.`,
      });
    } else { // creditor or debtor
      if (!data.clientName || !finalClientId) {
        toast({ variant: 'destructive', title: 'Client name is required for loans.' });
        return;
      }
      
      await addDebt({
        type: entryType,
        amount: data.amount,
        client_id: finalClientId,
        description: data.description!,
        due_date: data.due_date,
        account_id: data.account_id!,
        project_id: project_id,
      });
      toast({
        title: `${entryType === 'creditor' ? 'Loan Taken' : 'Loan Given'} added`,
        description: `Debt related to ${data.clientName} for ${formatCurrency(data.amount)} has been logged.`,
      });
    }
    form.reset();
    onFinished();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    clientName: '',
                    account_id: bankAccounts.find(acc => acc.is_primary)?.id,
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
                    <SelectItem value="creditor">Loan Taken (Creditor)</SelectItem>
                    <SelectItem value="debtor">Loan Given (Debtor)</SelectItem>
                    <SelectItem value="transfer">Bank Transfer</SelectItem>
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

        {entryType === 'transfer' && (
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
                    <FormControl>
                        <Input list="category-suggestions" placeholder="Type or select a category" {...field} value={field.value || ''} />
                    </FormControl>
                    <datalist id="category-suggestions">
                        {filteredCategories.map((cat) => (
                            <option key={cat} value={cat} />
                        ))}
                    </datalist>
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
                    name="clientName"
                    render={({ field }) => (
                      <FormItem>
                          <FormLabel>
                            {entryType === 'creditor' ? "Creditor Name" : "Debtor Name"}
                          </FormLabel>
                          <FormControl>
                            <Input list="client-suggestions" placeholder="Type or select a client" {...field} value={field.value || ''} />
                          </FormControl>
                           <datalist id="client-suggestions">
                                {filteredClients.map((client) => (
                                    <option key={client.id} value={client.name} />
                                ))}
                            </datalist>
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
          <FormField
            control={form.control}
            name="clientName"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Client (Optional)</FormLabel>
                    <FormControl>
                        <Input list="client-suggestions" placeholder="Type or select a client" {...field} value={field.value || ''} />
                    </FormControl>
                    <datalist id="client-suggestions">
                        {filteredClients.map((client) => (
                            <option key={client.id} value={client.name} />
                        ))}
                    </datalist>
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

        {(entryType === 'creditor' || entryType === 'debtor') && (
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

    
