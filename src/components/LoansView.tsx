
'use client';

import { useState, useMemo } from 'react';
import { useFinancials } from '@/hooks/useFinancials';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PlusCircle, Handshake, Loader2, Pencil, Trash2, HandCoins, ChevronDown, ChevronUp } from 'lucide-react';
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
import EditEntryForm from './EditEntryForm';


const loanSchema = z.object({
  type: z.enum(['loanGiven', 'loanTaken']),
  contact_id: z.string().min(1, "Please select or create a contact."),
  amount: z.coerce.number().positive("Amount must be positive."),
  date: z.date(),
  description: z.string().optional(),
  due_date: z.date().optional(),
  project_id: z.string().optional(),
  account_id: z.string({ required_error: 'Please select a bank account.' }),
});


function LoanForm({ onFinished }: { onFinished: () => void; }) {
  const { addLoan, projects, activeProject, contacts, addContact, allBankAccounts, currency, loans } = useFinancials();
  const { toast } = useToast();
  const personalProject = useMemo(() => projects.find(p => p.name === 'Personal'), [projects]);

  const form = useForm<z.infer<typeof loanSchema>>({
    resolver: zodResolver(loanSchema),
    defaultValues: {
      type: 'loanGiven',
      amount: '' as any,
      contact_id: '',
      description: '',
      date: new Date(),
      project_id: activeProject?.id !== 'all' ? activeProject?.id : personalProject?.id,
      account_id: allBankAccounts.find(acc => acc.is_primary)?.id
    }
  });

  const { isSubmitting } = form.formState;
  const watchedContactId = form.watch('contact_id');
  const watchedLoanType = form.watch('type');

  const contactOptions = useMemo(() => {
    return contacts.map(c => ({ value: c.id, label: c.name }));
  }, [contacts]);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
  };
  
  const existingLoanInfo = useMemo(() => {
    if (!watchedContactId) return null;
    const contactName = contacts.find(c => c.id === watchedContactId)?.name || watchedContactId;
    
    const totalTaken = loans.filter(l => l.contact_id === watchedContactId && l.type === 'loanTaken' && l.status === 'active').reduce((sum, l) => sum + l.amount, 0);
    const totalGiven = loans.filter(l => l.contact_id === watchedContactId && l.type === 'loanGiven' && l.status === 'active').reduce((sum, l) => sum + l.amount, 0);

    return { contactName, totalTaken, totalGiven };
  }, [watchedContactId, loans, contacts]);


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
        date: values.date.toISOString(),
        due_date: values.due_date?.toISOString(),
    };

    await addLoan(finalValues);
    toast({ title: 'Loan Added' });
    onFinished();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {existingLoanInfo && (existingLoanInfo.totalGiven > 0 || existingLoanInfo.totalTaken > 0) && (
             <div className="p-3 bg-muted/50 rounded-md border text-sm">
                 <p className='font-medium mb-1'>Existing loans with {existingLoanInfo.contactName}:</p>
                 {existingLoanInfo.totalGiven > 0 && <p>You have given: <span className="font-semibold">{formatCurrency(existingLoanInfo.totalGiven)}</span></p>}
                 {existingLoanInfo.totalTaken > 0 && <p>You have taken: <span className="font-semibold">{formatCurrency(existingLoanInfo.totalTaken)}</span></p>}
             </div>
        )}
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
            name="date"
            render={({ field }) => (
                <FormItem className="flex flex-col">
                <FormLabel>Date</FormLabel>
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
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4"/>}
          {isSubmitting ? 'Adding...' : 'Add Loan'}
        </Button>
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
  const [repayingContactId, setRepayingContactId] = useState<string | null>(null);


  const handleEditClick = (loan: Loan) => {
    setEditingLoan(loan);
    setEditFormOpen(true);
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
    groupedLoansGiven,
    groupedLoansTaken,
    loanRepayments,
  } = useMemo(() => {
    const repayments = new Map<string, number>();
    transactions.filter(t => t.type === 'repayment' && t.loan_id).forEach(t => {
      repayments.set(t.loan_id!, (repayments.get(t.loan_id!) || 0) + t.amount);
    });

    const groupLoans = (loanList: Loan[]) => {
      const grouped = new Map<string, { contactId: string; contactName: string; loans: Loan[]; total: number; totalRepaid: number }>();
      loanList.forEach(loan => {
        if (!grouped.has(loan.contact_id)) {
          grouped.set(loan.contact_id, {
            contactId: loan.contact_id,
            contactName: getContactName(loan.contact_id),
            loans: [],
            total: 0,
            totalRepaid: 0,
          });
        }
        const entry = grouped.get(loan.contact_id)!;
        entry.loans.push(loan);
        if (loan.status === 'active') {
          entry.total += loan.amount;
          entry.totalRepaid += repayments.get(loan.id) || 0;
        }
      });
      return Array.from(grouped.values());
    };
    
    return {
      groupedLoansGiven: groupLoans(loans.filter(l => l.type === 'loanGiven')),
      groupedLoansTaken: groupLoans(loans.filter(l => l.type === 'loanTaken')),
      loanRepayments: repayments,
    }
  }, [loans, transactions, contacts]);

  const closeRepayForm = () => {
      setRepayingContactId(null);
  }

  const handleEditFinished = () => {
    setEditFormOpen(false);
    setEditingLoan(null);
  }

  return (
    <Dialog open={repayingContactId !== null} onOpenChange={(open) => !open && setRepayingContactId(null)}>
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
                  <Button onClick={() => setAddFormOpen(true)}>
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
            <div>
              <h3 className="text-lg font-medium mb-2">Loans Given (You are the lender)</h3>
              {groupedLoansGiven.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                  {groupedLoansGiven.map(group => (
                    <ContactLoanGroup 
                      key={group.contactId}
                      group={group}
                      formatCurrency={formatCurrency}
                      loanRepayments={loanRepayments}
                      onEditClick={handleEditClick}
                      onDeleteClick={setDeletingLoan}
                      onRepayClick={(loan) => setRepayingContactId(loan.contact_id)}
                    />
                  ))}
                </Accordion>
              ) : <p className="text-sm text-muted-foreground text-center py-4">No loans given.</p>}
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2">Loans Taken (You are the borrower)</h3>
              {groupedLoansTaken.length > 0 ? (
                 <Accordion type="single" collapsible className="w-full">
                  {groupedLoansTaken.map(group => (
                    <ContactLoanGroup 
                      key={group.contactId}
                      group={group}
                      formatCurrency={formatCurrency}
                      loanRepayments={loanRepayments}
                      onEditClick={handleEditClick}
                      onDeleteClick={setDeletingLoan}
                      onRepayClick={(loan) => setRepayingContactId(loan.contact_id)}
                    />
                  ))}
                </Accordion>
              ) : <p className="text-sm text-muted-foreground text-center py-4">No loans taken.</p>}
            </div>
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
        {repayingContactId && (
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Log Repayment</DialogTitle>
                </DialogHeader>
                <RepaymentForm
                    contactId={repayingContactId}
                    onFinished={closeRepayForm}
                />
            </DialogContent>
        )}
    </Dialog>
  );
}

const ContactLoanGroup = ({ group, formatCurrency, loanRepayments, onEditClick, onDeleteClick, onRepayClick }: {
    group: { contactId: string; contactName: string; loans: Loan[]; total: number; totalRepaid: number; };
    formatCurrency: (amount: number) => string;
    loanRepayments: Map<string, number>;
    onEditClick: (loan: Loan) => void;
    onDeleteClick: (loan: Loan) => void;
    onRepayClick: (loan: Loan) => void;
}) => {
    const outstanding = group.total - group.totalRepaid;

    return (
        <AccordionItem value={group.contactName}>
            <AccordionTrigger>
                <div className="flex justify-between items-center w-full pr-4">
                    <span className="font-medium">{group.contactName}</span>
                    <div className="text-right">
                       {outstanding > 0 && <span className="font-semibold text-yellow-600">{formatCurrency(outstanding)}</span>}
                        <p className="text-xs text-muted-foreground">Total: {formatCurrency(group.total)}</p>
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent>
                <ul className="divide-y divide-border border rounded-md">
                    {group.loans.map(loan => (
                        <LoanItem
                            key={loan.id}
                            loan={loan}
                            formatCurrency={formatCurrency}
                            repaidAmount={loanRepayments.get(loan.id) || 0}
                            onEditClick={onEditClick}
                            onDeleteClick={onDeleteClick}
                            onRepayClick={onRepayClick}
                        />
                    ))}
                </ul>
            </AccordionContent>
        </AccordionItem>
    );
};

const LoanItem = ({ loan, formatCurrency, onEditClick, onDeleteClick, onRepayClick, repaidAmount }: {
  loan: Loan;
  formatCurrency: (amount: number) => string;
  repaidAmount: number;
  onEditClick: (loan: Loan) => void;
  onDeleteClick: (loan: Loan) => void;
  onRepayClick: (loan: Loan) => void;
}) => {
  const outstandingAmount = loan.amount - repaidAmount;

  return (
    <li className="p-3 group hover:bg-muted/50">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <Handshake className="h-5 w-5 text-muted-foreground" />
                <div>
                     <p className={cn("font-medium", loan.status === 'paid' && 'line-through')}>{formatCurrency(loan.amount)}</p>
                    {loan.description && <p className="text-sm text-muted-foreground">{loan.description}</p>}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>On: {format(parseISO(loan.date), 'PPP')}</span>
                        {loan.due_date && <span>Due: {format(parseISO(loan.due_date), 'PPP')}</span>}
                        {loan.status === 'active' && outstandingAmount > 0 && outstandingAmount < loan.amount && (
                            <span className='font-semibold text-blue-600'>Repaid: {formatCurrency(repaidAmount)}</span>
                        )}
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
