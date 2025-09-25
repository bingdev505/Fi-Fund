'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useFinancials } from '@/hooks/useFinancials';
import { CURRENCIES } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Landmark, Loader2 } from 'lucide-react';

const bankAccountSchema = z.object({
  name: z.string().min(2, 'Bank name must be at least 2 characters'),
  balance: z.coerce.number().min(0, 'Balance cannot be negative'),
});

export default function Settings() {
  const { currency, setCurrency, bankAccounts, addBankAccount, isLoading } = useFinancials();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof bankAccountSchema>>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      name: '',
      balance: 0,
    },
  });
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
  }

  function handleCurrencyChange(value: string) {
    setCurrency(value);
    toast({
      title: 'Currency Updated',
      description: `The currency has been set to ${value}.`,
    });
  }

  function onAddBankAccount(values: z.infer<typeof bankAccountSchema>) {
    addBankAccount(values);
    toast({
      title: 'Bank Account Added',
      description: `${values.name} with a balance of ${formatCurrency(values.balance)} has been added.`,
    });
    form.reset();
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Currency Settings</CardTitle>
          <CardDescription>Select your preferred currency for the application.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full max-w-xs">
            <Select onValueChange={handleCurrencyChange} defaultValue={currency}>
              <SelectTrigger>
                <SelectValue placeholder="Select a currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(c => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bank Accounts</CardTitle>
          <CardDescription>Add and manage your bank accounts.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onAddBankAccount)} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. My Savings Account" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="balance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Balance ({currency})</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g. 50000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="self-end">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Account
              </Button>
            </form>
          </Form>

          <Separator className="my-6" />

          <div>
            <h3 className="text-lg font-medium mb-4">Your Accounts</h3>
            {isLoading ? (
              <div className="flex justify-center items-center h-24">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : bankAccounts.length > 0 ? (
              <ul className="space-y-4">
                {bankAccounts.map(account => (
                  <li key={account.id} className="flex items-center justify-between p-3 rounded-md border bg-muted/50">
                    <div className="flex items-center gap-3">
                        <Landmark className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">{account.name}</span>
                    </div>
                    <span className="font-semibold">{formatCurrency(account.balance)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-4">You haven't added any bank accounts yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
