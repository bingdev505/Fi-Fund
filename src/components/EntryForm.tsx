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
import { RadioGroup, RadioGroupItem } from './ui/radio-group';

const formSchema = z.object({
  entryType: z.enum(['expense', 'income', 'creditor', 'debtor', 'transfer']),
  amount: z.coerce.number().positive('Amount must be positive'),
  category: z.string().optional(),
  clientName: z.string().optional(), // For debts - can be new or existing
  description: z.string().min(3, 'Description must be at least 3 characters'),
  dueDate: z.date().optional(),
  accountId: z.string().optional(), // for income/expense/debts
  fromAccountId: z.string().optional(), // for transfer
  toAccountId: z.string().optional(), // for transfer
  clientId: z.string().optional(), // to associate income/expense to client
  projectId: z.string().optional(), // to associate with a business
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
      accountId: '',
      fromAccountId: '',
      toAccountId: '',
      clientId: '',
      dueDate: undefined,
      projectId: activeProject && activeProject.id !== 'all' ? activeProject.id : '',
    },
  });

  const entryType = form.watch('entryType');
  const selectedProjectId = form.watch('projectId');

  const filteredClients = useMemo(() => {
    if (!selectedProjectId) return clients.filter(c => !c.projectId);
    return clients.filter(c => c.projectId === selectedProjectId);
  }, [clients, selectedProjectId]);

  const filteredCategories = useMemo(() => {
    const baseCategories = entryType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const projectCategories = customCategories
        .filter(c => (!selectedProjectId || c.projectId === selectedProjectId) && c.type === entryType)
        .map(c => c.name);
    return [...new Set([...baseCategories, ...projectCategories])];
  }, [entryType, customCategories, selectedProjectId]);
  
   useEffect(() => {
    form.setValue('projectId', activeProject && activeProject.id !== 'all' ? activeProject.id : '');
  }, [activeProject, form]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    const { entryType, ...data } = values;

    const projectId = data.projectId === '' ? undefined : data.projectId;

    if (entryType === 'income' || entryType === 'expense' || entryType === 'transfer') {
      
      // Auto-create category if it's new
      if (data.category && !filteredCategories.includes(data.category) && (entryType === 'income' || entryType === 'expense')) {
        addCategory({ name: data.category, type: entryType }, projectId);
      }

      addTransaction({
        type: entryType,
        amount: data.amount,
        category: entryType === 'transfer' ? 'Bank Transfer' : data.category!,
        description: data.description,
        accountId: data.accountId,
        fromAccountId: data.fromAccountId,
        toAccountId: data.toAccountId,
        clientId: data.clientId === '' ? undefined : data.clientId,
        projectId: projectId,
      });
      toast({
        title: `${entryType.charAt(0).toUpperCase() + entryType.slice(1)} added`,
        description: `${formatCurrency(data.amount)} has been logged.`,
      });
    } else { // creditor or debtor
      if (!data.clientName) {
        toast({ variant: 'destructive', title: 'Client name is required.' });
        return;
      }
      
      let client = clients.find(c => c.name.toLowerCase() === data.clientName!.toLowerCase() && (!c.projectId || c.projectId === projectId));
      if (!client) {
          client = addClient({ name: data.clientName! }, projectId);
      }

      addDebt({
        type: entryType,
        amount: data.amount,
        name: client.name,
        clientId: client.id,
        description: data.description,
        dueDate: data.dueDate,
        accountId: data.accountId!,
        projectId: projectId,
      });
      toast({
        title: `${entryType === 'creditor' ? 'Loan Taken' : 'Loan Given'} added`,
        description: `Debt related to ${client.name} for ${formatCurrency(data.amount)} has been logged.`,
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
                    clientId: '',
                    clientName: '',
                    accountId: '',
                    fromAccountId: '',
                    toAccountId: '',
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
            name="projectId"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Business (Optional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Personal / No Business" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="personal">Personal / No Business</SelectItem>
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
              name="fromAccountId"
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
              name="toAccountId"
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
                name="accountId"
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
                    name="accountId"
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
            name="clientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client (Optional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Personal / No Client" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {filteredClients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
