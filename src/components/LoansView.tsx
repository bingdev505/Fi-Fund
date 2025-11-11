
'use client';

import { useState, useMemo } from 'react';
import { useFinancials } from '@/hooks/useFinancials';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PlusCircle, Handshake, Loader2, Pencil, Trash2, HandCoins } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Combobox } from './ui/combobox';
import type { Loan } from '@/lib/types';
import RepaymentForm from './RepaymentForm';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import SummaryCard from './SummaryCard';
import EditEntryForm from './EditEntryForm';


const loanSchema = z.object({
  type: z.enum(['loanGiven', 'loanTaken']),
  contact_id: z.string().min(1, "Please select or create a contact."),
  amount: z.coerce.number().positive("Amount must be positive."),
  description: z.string().optional(),
  due_date: z.date().optional(),
  project_id: z.string().optional(),
  account_id: z.string({ required_error: 'Please select a bank account.' }),
});


function LoanForm({ onFinished }: { onFinished: () => void; }) {
  const { addLoan, projects, activeProject, contacts, addContact, allBankAccounts, currency } = useFinancials();
  const { toast } = useToast();
  const personalProject = useMemo(() => projects.find(p => p.name === 'Personal'), [projects]);

  const form = useForm<z.infer<typeof loanSchema>>({
    resolver: zodResolver(loanSchema),
    defaultValues: {
      type: 'loanGiven',
      amount: '' as any,
      contact_id: '',
      description: '',
      project_id: activeProject?.id !== 'all' ? activeProject?.id : personalProject?.id,
      account_id: allBankAccounts.find(acc => acc.is_primary)?.id
    }
  });

  const contactOptions = useMemo(() => {
    return contacts.map(c => ({ value: c.id, label: c.name }));
  }, [contacts]);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
  };

  async function onSubmit(values: z.infer<typeof loanSchema>) {
    let contactId = values.contact_id;
    const isNewContact = !contacts.some(c => c.id === contactId);

    if (isNewContact && contactId) {
        try {
            const newContact = await addContact({ name: contactId });
            contactId = newContact.id;
        } catch (error) {
            toast({ variant: 'destructive', title: 'Could not create contact.' });
            return;
        }
    }
    
    const finalValues = {
        ...values,
        status: 'active',
        contact_id: contactId,
        due_date: values.due_date?.toISOString(),
    };

    await addLoan(finalValues);
    toast({ title: 'Loan Added' });
    onFinished();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>Loan Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
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
                name="contact_id"
                render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>Contact</FormLabel>
                    <Combobox
                    options={contactOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select / Create"
                    searchPlaceholder="Search contacts..."
                    noResultsText="No contacts found."
                    />
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 5000" {...field} />
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
                    {allBankAccounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name} ({formatCurrency(acc.balance)})
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
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g., For project materials" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
                      variant="outline"
                      className={cn(
                        'w-full pl-3 text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                </PopoverContent>
              </Popover>
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
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a Business" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {projects.map(p => (
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
        <Button type="submit" className="w-full">Add Loan</Button>
      </form>
    </Form>
  );
}


export default function LoansView() {
  const { loans, deleteLoan, contacts, currency, transactions } = useFinancials();
  const { toast } = useToast();
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [deletingLoan, setDeletingLoan] = useState<Loan | null>(null);
  const [repayingLoan, setRepayingLoan] = useState<Loan | null>(null);

  const handleEditClick = (loan: Loan) => {
    setEditingLoan(loan);
    setEditFormOpen(true);
  };
  
  const handleAddClick = () => {
    setEditingLoan(null);
    setAddFormOpen(true);
  };

  const handleDelete = () => {
    if (!deletingLoan) return;
    deleteLoan(deletingLoan.id);
    toast({ title: "Loan Deleted" });
    setDeletingLoan(null);
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
  };
  
  const getContactName = (contactId: string) => {
    return contacts.find(c => c.id === contactId)?.name || 'Unknown Contact';
  }

  const {
    activeLoansGiven,
    paidLoansGiven,
    activeLoansTaken,
    paidLoansTaken,
    loanRepayments,
  } = useMemo(() => {
    const repayments = new Map<string, number>();
    transactions.filter(t => t.type === 'repayment' && t.loan_id).forEach(t => {
      repayments.set(t.loan_id!, (repayments.get(t.loan_id!) || 0) + t.amount);
    });
  
    const allGiven = loans.filter(l => l.type === 'loanGiven');
    const allTaken = loans.filter(l => l.type === 'loanTaken');
    
    return {
      activeLoansGiven: allGiven.filter(l => l.status === 'active'),
      paidLoansGiven: allGiven.filter(l => l.status === 'paid'),
      activeLoansTaken: allTaken.filter(l => l.status === 'active'),
      paidLoansTaken: allTaken.filter(l => l.status === 'paid'),
      loanRepayments: repayments,
    }
  }, [loans, transactions]);

  const closeRepayForm = () => {
      setRepayingLoan(null);
  }

  const handleEditFinished = () => {
    setEditFormOpen(false);
    setEditingLoan(null);
  }

  return (
    <Dialog open={repayingLoan !== null} onOpenChange={(open) => !open && setRepayingLoan(null)}>
      <AlertDialog>
        <div className="space-y-6">
        <Card>
          <CardHeader>
             <div className="flex justify-between items-center">
              <div>
                <CardTitle>Loan Manager</CardTitle>
                <CardDescription>Track money you've borrowed or lent.</CardDescription>
              </div>
              <Dialog open={addFormOpen} onOpenChange={setAddFormOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleAddClick}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Loan
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add a New Loan</DialogTitle></DialogHeader>
                  <LoanForm onFinished={() => setAddFormOpen(false)} />
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
                <>
                <div>
                  <h3 className="text-lg font-medium mb-2">Loans Given</h3>
                  {activeLoansGiven.length > 0 ? (
                    <div className="border rounded-md">
                      <ul className="divide-y divide-border">
                        {activeLoansGiven.map(loan => (
                          <LoanItem
                            key={loan.id}
                            loan={loan}
                            contactName={getContactName(loan.contact_id)}
                            formatCurrency={formatCurrency}
                            repaidAmount={loanRepayments.get(loan.id) || 0}
                            onEditClick={handleEditClick}
                            onDeleteClick={setDeletingLoan}
                            onRepayClick={setRepayingLoan}
                          />
                        ))}
                      </ul>
                    </div>
                  ) : <p className="text-sm text-muted-foreground text-center py-4">No active loans given.</p>}
                  {paidLoansGiven.length > 0 && (
                      <Accordion type="single" collapsible className="w-full mt-4">
                          <AccordionItem value="paid-given">
                              <AccordionTrigger>View Paid Loans ({paidLoansGiven.length})</AccordionTrigger>
                              <AccordionContent>
                                <div className="border rounded-md">
                                    <ul className="divide-y divide-border">
                                        {paidLoansGiven.map(loan => (
                                            <LoanItem key={loan.id} loan={loan} contactName={getContactName(loan.contact_id)} formatCurrency={formatCurrency} repaidAmount={loanRepayments.get(loan.id) || 0} onEditClick={handleEditClick} onDeleteClick={setDeletingLoan} onRepayClick={setRepayingLoan} />
                                        ))}
                                    </ul>
                                </div>
                              </AccordionContent>
                          </AccordionItem>
                      </Accordion>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Loans Taken</h3>
                  {activeLoansTaken.length > 0 ? (
                     <div className="border rounded-md">
                      <ul className="divide-y divide-border">
                        {activeLoansTaken.map(loan => (
                           <LoanItem
                            key={loan.id}
                            loan={loan}
                            contactName={getContactName(loan.contact_id)}
                            formatCurrency={formatCurrency}
                            repaidAmount={loanRepayments.get(loan.id) || 0}
                            onEditClick={handleEditClick}
                            onDeleteClick={setDeletingLoan}
                            onRepayClick={setRepayingLoan}
                          />
                        ))}
                      </ul>
                    </div>
                  ) : <p className="text-sm text-muted-foreground text-center py-4">No active loans taken.</p>}
                   {paidLoansTaken.length > 0 && (
                      <Accordion type="single" collapsible className="w-full mt-4">
                          <AccordionItem value="paid-taken">
                              <AccordionTrigger>View Paid Loans ({paidLoansTaken.length})</AccordionTrigger>
                              <AccordionContent>
                                <div className="border rounded-md">
                                    <ul className="divide-y divide-border">
                                        {paidLoansTaken.map(loan => (
                                            <LoanItem key={loan.id} loan={loan} contactName={getContactName(loan.contact_id)} formatCurrency={formatCurrency} repaidAmount={loanRepayments.get(loan.id) || 0} onEditClick={handleEditClick} onDeleteClick={setDeletingLoan} onRepayClick={setRepayingLoan} />
                                        ))}
                                    </ul>
                                </div>
                              </AccordionContent>
                          </AccordionItem>
                      </Accordion>
                  )}
                </div>
                </>
          </CardContent>
        </Card>
        </div>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>This action cannot be undone. This will permanently delete this loan record.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeletingLoan(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
        <Dialog open={editFormOpen} onOpenChange={setEditFormOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Loan</DialogTitle>
                </DialogHeader>
                {editingLoan && <EditEntryForm entry={editingLoan} onFinished={handleEditFinished} />}
            </DialogContent>
        </Dialog>
      </AlertDialog>

       <DialogContent>
          <DialogHeader>
              <DialogTitle>Log Repayment</DialogTitle>
          </DialogHeader>
          {repayingLoan && <RepaymentForm
              loan={repayingLoan}
              outstandingAmount={repayingLoan.amount - (loanRepayments.get(repayingLoan.id) || 0)}
              onFinished={closeRepayForm}
          />}
      </DialogContent>
    </Dialog>
  );
}

const LoanItem = ({ loan, contactName, formatCurrency, onEditClick, onDeleteClick, onRepayClick, repaidAmount }: {
  loan: Loan;
  contactName: string;
  formatCurrency: (amount: number) => string;
  repaidAmount: number;
  onEditClick: (loan: Loan) => void;
  onDeleteClick: (loan: Loan) => void;
  onRepayClick: (loan: Loan) => void;
}) => {
  const outstandingAmount = loan.amount - repaidAmount;

  return (
    <li className="p-4 group hover:bg-muted/50">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <Handshake className="h-5 w-5 text-muted-foreground" />
                <div>
                    <p className="font-medium">{contactName} - <span className={cn("font-normal", loan.type === 'loanGiven' ? 'text-red-600' : 'text-green-600')}>{formatCurrency(loan.amount)}</span></p>
                    <p className="text-sm text-muted-foreground">{loan.description}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {loan.due_date && <span>Due: {format(parseISO(loan.due_date), 'PPP')}</span>}
                        {loan.status === 'active' && outstandingAmount > 0 && (
                            <span className='font-semibold text-yellow-600'>Outstanding: {formatCurrency(outstandingAmount)}</span>
                        )}
                        <span className={cn('font-semibold', loan.status === 'active' ? 'text-yellow-600' : 'text-green-600')}>{loan.status}</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center">
                <div className='flex items-center'>
                    {loan.status === 'active' && (
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => onRepayClick(loan)} title="Log Repayment">
                                <HandCoins className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                    )}
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => onEditClick(loan)}><Pencil className="h-4 w-4" /></Button>
                    </DialogTrigger>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => onDeleteClick(loan)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </AlertDialogTrigger>
                </div>
            </div>
        </div>
    </li>
  )
}
