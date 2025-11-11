
'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Bot, Loader2, Send, User, PlusCircle, Pencil, Trash2, HandCoins, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { routeUserIntent } from '@/app/actions';
import { useFinancials } from '@/hooks/useFinancials';
import { useToast } from '@/hooks/use-toast';
import type { ChatMessage, Loan, Transaction, Contact } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import EditEntryForm from './EditEntryForm';
import EntryForm from './EntryForm';
import { useAuth } from '@/context/AuthContext';
import RepaymentForm from './RepaymentForm';
import { format } from 'date-fns';

const useChatHistory = () => {
    const { chatMessages, addChatMessage, updateChatMessage, deleteChatMessage, isLoading: isFinancialsLoading, loadMoreChatMessages, hasMoreChatMessages } = useFinancials();
    
    return {
        messages: chatMessages,
        addMessage: addChatMessage,
        updateMessage: updateChatMessage,
        deleteMessage: deleteChatMessage,
        isLoading: isFinancialsLoading,
        loadMoreMessages: loadMoreChatMessages,
        hasMoreMessages: hasMoreChatMessages,
    };
};


export default function AIChat() {
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastProcessedMessage, setLastProcessedMessage] = useState('');
  const { 
    addTransactions,
    addOrUpdateLoan,
    addRepayment,
    currency, 
    transactions, 
    loans, 
    bankAccounts,
    contacts,
    addContact,
    clients,
    addClient,
    categories,
    addCategory,
    getTransactionById,
    getLoanById,
    deleteTransaction,
    deleteLoan,
    activeProject
  } = useFinancials();
  const { toast } = useToast();
  const viewportRef = useRef<HTMLDivElement>(null);
  const scrollEndRef = useRef<HTMLDivElement>(null);
  
  const { messages, addMessage, updateMessage, deleteMessage, isLoading: isMessagesLoading, loadMoreMessages, hasMoreMessages } = useChatHistory();

  const [editingEntry, setEditingEntry] = useState<Transaction | Loan | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<Transaction | Loan | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [isRepayLoanOpen, setIsRepayLoanOpen] = useState(false);
  const [selectedLoanToRepay, setSelectedLoanToRepay] = useState<Loan | null>(null);

  const activeLoans = useMemo(() => loans.filter(l => l.status === 'active'), [loans]);
  const loanRepayments = useMemo(() => {
    const repayments = new Map<string, number>();
    transactions.filter(t => t.type === 'repayment' && t.loan_id).forEach(t => {
      repayments.set(t.loan_id!, (repayments.get(t.loan_id!) || 0) + t.amount);
    });
    return repayments;
  }, [transactions]);


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleScroll = async () => {
      if (viewport.scrollTop === 0 && hasMoreMessages && !isFetchingMore) {
        setIsFetchingMore(true);
        const { scrollHeight: previousScrollHeight, scrollTop: previousScrollTop } = viewport;
        await loadMoreMessages();
        // Use requestAnimationFrame to wait for the DOM to update
        requestAnimationFrame(() => {
          const newScrollHeight = viewport.scrollHeight;
          viewport.scrollTop = newScrollHeight - previousScrollHeight + previousScrollTop;
          setIsFetchingMore(false);
        });
      }
    };
    
    viewport.addEventListener('scroll', handleScroll);
    return () => viewport.removeEventListener('scroll', handleScroll);
  }, [hasMoreMessages, isFetchingMore, loadMoreMessages]);


  useEffect(() => {
    // Scroll to bottom on initial load and when new messages are added.
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isMessagesLoading, isProcessing]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
  };

  const handleEditClick = (message: ChatMessage) => {
    if (!message.transaction_id) return;
    
    const entry = getLoanById(message.transaction_id) || getTransactionById(message.transaction_id);

    if (entry) {
        setEditingEntry(entry);
        setEditDialogOpen(true);
    }
  };

  const handleDeleteClick = (message: ChatMessage) => {
    if (!message.transaction_id) return;
    const entry = getLoanById(message.transaction_id) || getTransactionById(message.transaction_id);
    if(entry) {
        setDeletingEntry(entry);
        setDeleteDialogOpen(true);
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingEntry) return;

    const messageToDelete = messages.find(m => m.transaction_id === deletingEntry?.id);

    if ('category' in deletingEntry) {
      deleteTransaction(deletingEntry as Transaction, messageToDelete?.id);
      toast({ title: "Transaction Deleted" });
    } else {
      deleteLoan((deletingEntry as Loan).id, messageToDelete?.id);
      toast({ title: "Loan Deleted" });
    }

    if (messageToDelete) {
        await deleteMessage(messageToDelete.id);
    }

    setDeletingEntry(null);
    setDeleteDialogOpen(false);
  };

  const handleEditFinished = async (originalEntry: Transaction | Loan, updatedEntry: Transaction | Loan) => {
    const messageToUpdate = messages.find(m => m.transaction_id === originalEntry.id);
    if (messageToUpdate) {
        let newContent = '';
        if (updatedEntry.type === 'income' || updatedEntry.type === 'expense') {
            const tx = updatedEntry as Transaction;
            const accountName = bankAccounts.find(ba => ba.id === tx.account_id)?.name || 'an account';
            newContent = `${tx.type.charAt(0).toUpperCase() + tx.type.slice(1)} of ${formatCurrency(tx.amount)} in ${tx.category} logged to ${accountName}.`
        } else if (updatedEntry.type === 'loanGiven' || updatedEntry.type === 'loanTaken') {
            const loan = updatedEntry as Loan;
            const accountName = bankAccounts.find(ba => ba.id === loan.account_id)?.name || 'an account';
            const contactName = contacts.find(c => c.id === loan.contact_id)?.name || 'a contact';
            newContent = `${loan.type.charAt(0).toUpperCase() + loan.type.slice(1)} of ${formatCurrency(loan.amount)} for ${contactName} logged against ${accountName}.`
        }

        if (newContent) {
            await updateMessage(messageToUpdate.id, { content: newContent });
        }
    }
    setEditingEntry(null);
    setEditDialogOpen(false);
  };


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
     if (input.trim() === lastProcessedMessage) {
      toast({
        variant: 'destructive',
        title: 'Duplicate message',
        description: 'You just sent that message.',
      });
      return;
    }

    const userMessageContent = input;
    setInput('');

    await addMessage({
      role: 'user',
      content: userMessageContent,
    });

    setIsProcessing(true);

    try {
      const financialData = JSON.stringify({
        businessName: activeProject?.name || 'Personal',
        transactions,
        loans,
        bankAccounts,
      });
      
      let chatHistoryForContext = '';
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];

        if (lastMessage?.timestamp) {
            const lastMessageDate = new Date(lastMessage.timestamp);
            const now = new Date();
            const timeDiffMinutes = (now.getTime() - lastMessageDate.getTime()) / (1000 * 60);

            if (timeDiffMinutes < 5) {
            chatHistoryForContext = messages
                .slice(-4)
                .map(msg => `${msg.role}: ${msg.content}`)
                .join('\n');
            }
        }
      }

      const result = await routeUserIntent({ 
        chat_input: userMessageContent, 
        financial_data: financialData,
        chat_history: chatHistoryForContext
      });

      let assistantResponse = '';
      let transactionIds: string[] = [];

      if (result.intent === 'logData') {
        const logResults = result.result;
        
        let responseParts: string[] = [];
        const newTransactions: Omit<Transaction, 'id' | 'date' | 'user_id'>[] = [];
        const newLoans: Omit<Loan, 'id' | 'user_id' | 'created_at' | 'date' | 'status'>[] = [];
        
        const projectId = activeProject?.id === 'all' ? undefined : activeProject?.id;
        const businessName = activeProject?.name || 'Personal';

        for (const logResult of logResults) {
            let accountIdToUse: string | undefined;
            let accountNameToUse: string | undefined;
            let wasAccountFound = false;

            if (logResult.account_name) {
                const searchName = logResult.account_name.toLowerCase();
                const foundAccount = bankAccounts.find(acc => acc.name.toLowerCase().includes(searchName));
                
                if (foundAccount) {
                    accountIdToUse = foundAccount.id;
                    accountNameToUse = foundAccount.name;
                    wasAccountFound = true;
                } else {
                    responseParts.push(`Could not find account '${logResult.account_name}'.`);
                    continue;
                }
            } else {
                const primaryAccount = bankAccounts.find(acc => acc.is_primary);
                if (primaryAccount) {
                    accountIdToUse = primaryAccount.id;
                    accountNameToUse = primaryAccount.name;
                    wasAccountFound = true;
                }
            }

            if (!wasAccountFound) {
                responseParts.push("Could not log an entry as no primary account is set.");
                continue;
            }

            if (!accountIdToUse) {
                responseParts.push("Could not log an entry as no primary account is set.");
                toast({
                  variant: 'destructive',
                  title: 'No Account Available',
                  description: 'Please set a primary bank account in settings, or specify an account in your message.',
                });
                continue;
            }

            if (logResult.transaction_type === 'income' || logResult.transaction_type === 'expense') {
                let clientId: string | undefined;
                if(logResult.client_name) {
                    let client = clients.find(c => c.name.toLowerCase() === logResult.client_name!.toLowerCase() && c.project_id === projectId);
                    if(!client) {
                        client = await addClient({ name: logResult.client_name }, projectId);
                        responseParts.push(`Created new client '${client.name}'.`);
                    }
                    clientId = client.id;
                }
                
                if (logResult.category) {
                  const categoryExists = categories.some(
                    (c) =>
                      c.name.toLowerCase() === logResult.category!.toLowerCase() &&
                      c.type === logResult.transaction_type
                  );
                  if (!categoryExists) {
                    await addCategory({ name: logResult.category, type: logResult.transaction_type }, projectId);
                     responseParts.push(`Created new category '${logResult.category}'.`);
                  }
                }

                newTransactions.push({
                    type: logResult.transaction_type,
                    amount: logResult.amount,
                    category: logResult.category!,
                    description: logResult.description || 'AI Logged Transaction',
                    account_id: accountIdToUse,
                    project_id: projectId,
                    client_id: clientId,
                });
                const toastDescription = `${logResult.transaction_type} of ${formatCurrency(logResult.amount)} in ${logResult.category} logged under '${businessName}' to ${accountNameToUse}.`;
                responseParts.push(toastDescription);
            } else if (logResult.transaction_type === 'repayment') {
                 if (!logResult.contact_id) {
                    responseParts.push("Could not log repayment: contact name is missing.");
                } else {
                    const contact = contacts.find(c => c.name.toLowerCase() === logResult.contact_id!.toLowerCase());
                    if (!contact) {
                         responseParts.push(`Could not find contact '${logResult.contact_id}'.`);
                    } else {
                        const activeLoansForContact = loans.filter(l => l.contact_id === contact.id && l.status === 'active');
                        if (activeLoansForContact.length === 0) {
                            responseParts.push(`No active loans with ${contact.name} to repay.`);
                        } else if (activeLoansForContact.length > 1) {
                            responseParts.push(`Multiple active loans with ${contact.name}. Please log repayment manually.`);
                        } else {
                            const loanToRepay = activeLoansForContact[0];
                            const repaymentRef = await addRepayment(loanToRepay, logResult.amount, accountIdToUse, true);
                            if (repaymentRef) transactionIds.push(repaymentRef.id);
                            responseParts.push(`Logged repayment of ${formatCurrency(logResult.amount)} for loan with ${contact.name} under '${businessName}'.`);
                        }
                    }
                }
            } else { // loanGiven or loanTaken
                if (!logResult.contact_id) {
                    responseParts.push(`Could not log loan: contact name is missing.`);
                    continue;
                }

                let contact = contacts.find(c => c.name.toLowerCase() === logResult.contact_id!.toLowerCase());
                if (!contact) {
                    try {
                      contact = await addContact({ name: logResult.contact_id });
                      responseParts.push(`Created new contact '${contact.name}'.`);
                    } catch (e) {
                      console.error("Failed to create new contact:", e);
                      responseParts.push(`Could not create new contact '${logResult.contact_id}'.`);
                      continue; 
                    }
                }

                newLoans.push({
                    type: logResult.transaction_type,
                    amount: logResult.amount,
                    contact_id: contact.id, 
                    description: logResult.description || 'AI Logged Loan',
                    account_id: accountIdToUse,
                    project_id: projectId
                });

                 const toastDescription = `${logResult.transaction_type === 'loanGiven' ? 'Loan given to' : 'Loan taken from'} ${contact.name} for ${formatCurrency(logResult.amount)} logged under '${businessName}' against account ${accountNameToUse}.`;
                responseParts.push(toastDescription);
            }
        }
        
        if(newTransactions.length > 0) {
            const addedRefs = await addTransactions(newTransactions);
            transactionIds.push(...addedRefs.map(r => r.id));
        }

        for (const loan of newLoans) {
            const addedRef = await addOrUpdateLoan(loan, true);
            if (addedRef) transactionIds.push(addedRef.id);
        }

        assistantResponse = responseParts.join(' ');
        if (logResults.length > 1) {
            toast({
                title: 'Logged Multiple Entries',
                description: `The AI logged ${logResults.length} separate financial entries.`,
            });
        } else if (logResults.length === 1) {
             toast({
                title: 'Logged via AI Chat',
                description: assistantResponse,
            });
        }
         setLastProcessedMessage(userMessageContent);
      } else if (result.intent === 'question') {
        assistantResponse = result.result.answer;
         setLastProcessedMessage(userMessageContent);
      } else { // intent is 'command'
        assistantResponse = result.result.response;
      }

      await addMessage({
        role: 'assistant',
        content: assistantResponse,
        transaction_id: transactionIds.length > 0 ? transactionIds[0] : undefined,
      });

    } catch (error) {
      console.error('AI Chat Error:', error);
      await addMessage({
        role: 'assistant',
        content: "Sorry, I couldn't understand that. Please try rephrasing, for example: 'Lunch for 250 rupees' or 'What is my total income?'.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <ScrollArea className="flex-1" viewportRef={viewportRef}>
        <div className="space-y-4 p-4">
          {isFetchingMore && (
              <div className="flex justify-center my-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
          )}
          {!isMessagesLoading && messages?.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <Bot className="h-12 w-12 mb-4" />
                <h2 className="text-xl font-semibold mb-2">Welcome to FinanceFlow AI</h2>
                <p>You can start by logging a transaction like 'Spent 500 on groceries in savings'</p>
                <p>or ask a question like 'What's my total income this month?'</p>
            </div>
          )}
          {messages && messages.map(message => (
            <div key={message.id} className={cn('flex items-start gap-3 group', message.role === 'user' ? 'justify-end' : '')}>
              {message.role === 'assistant' && (
                <Avatar className="h-8 w-8 border bg-white">
                  <AvatarFallback className="bg-transparent"><Bot className="text-primary" /></AvatarFallback>
                </Avatar>
              )}
              <div className={cn('rounded-lg px-3 py-2 max-w-[75%] shadow-sm text-sm relative', message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-white text-foreground')}>
                 {message.transaction_id && (
                  <div className="absolute top-1/2 -translate-y-1/2 -left-20 group-hover-mobile-opacity transition-opacity flex items-center bg-white rounded-full border shadow-sm ml-[30px]">
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => handleEditClick(message)}>
                          <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => handleDeleteClick(message)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                  </div>
                )}
                <p>{message.content}</p>
              </div>
              {message.role === 'user' && (
                <Avatar className="h-8 w-8 border">
                  <AvatarFallback><User /></AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
           {isProcessing && !isFetchingMore && (
            <div className="flex items-start gap-3">
              <Avatar className="h-8 w-8 border bg-white">
                <AvatarFallback className="bg-transparent"><Bot className="text-primary" /></AvatarFallback>
              </Avatar>
              <div className="rounded-lg px-4 py-2 bg-white flex items-center shadow-sm">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={scrollEndRef} />
        </div>
      </ScrollArea>
      
      <div className="shrink-0 bg-background/80 backdrop-blur-sm p-4 border-t">
        <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
          <Input
              id="chat-input"
              aria-label="Chat message"
              value={input}
              onChange={handleInputChange}
              placeholder="Type your message..."
              disabled={isProcessing || isMessagesLoading}
              autoComplete='off'
              className="flex-1 rounded-full bg-muted"
          />
          {input.trim() ? (
            <Button type="submit" size="icon" disabled={isProcessing || isMessagesLoading} className="rounded-full flex-shrink-0">
              <Send className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          ) : (
            <>
              <Dialog open={isTransactionFormOpen} onOpenChange={setIsTransactionFormOpen}>
                  <DialogTrigger asChild>
                      <Button type="button" size="icon" className="rounded-full flex-shrink-0 bg-primary text-primary-foreground">
                          <PlusCircle className="h-4 w-4" />
                          <span className="sr-only">Add Transaction</span>
                      </Button>
                  </DialogTrigger>
                  <DialogContent>
                      <DialogHeader>
                          <DialogTitle>Add a New Transaction</DialogTitle>
                      </DialogHeader>
                      <EntryForm onFinished={() => setIsTransactionFormOpen(false)} />
                  </DialogContent>
              </Dialog>
              <Dialog open={isRepayLoanOpen} onOpenChange={(open) => {
                  if (!open) setSelectedLoanToRepay(null);
                  setIsRepayLoanOpen(open);
              }}>
                  <DialogTrigger asChild>
                       <Button type="button" size="icon" className="rounded-full flex-shrink-0 bg-primary text-primary-foreground">
                          <HandCoins className="h-4 w-4" />
                          <span className="sr-only">Repay Loan</span>
                      </Button>
                  </DialogTrigger>
                  <DialogContent>
                      <DialogHeader>
                          <DialogTitle>Repay Loan</DialogTitle>
                      </DialogHeader>
                      {selectedLoanToRepay ? (
                          <RepaymentForm 
                              loan={selectedLoanToRepay} 
                              outstandingAmount={selectedLoanToRepay.amount - (loanRepayments.get(selectedLoanToRepay.id) || 0)}
                              onFinished={() => {
                                  setSelectedLoanToRepay(null);
                                  setIsRepayLoanOpen(false);
                              }}
                          />
                      ) : (
                          <div className="py-4">
                          {activeLoans.length > 0 ? (
                          <ul className="space-y-2 max-h-64 overflow-y-auto">
                              {activeLoans.map(loan => (
                              <li key={loan.id}>
                                  <Button
                                  variant="outline"
                                  className="w-full justify-between h-auto py-2"
                                  onClick={() => setSelectedLoanToRepay(loan)}
                                  >
                                  <div className="text-left">
                                      <p className="font-semibold">{contacts.find(c => c.id === loan.contact_id)?.name}</p>
                                      <p className="text-sm text-muted-foreground">{formatCurrency(loan.amount)} on {format(new Date(loan.date), "PPP")}</p>
                                      <p className="text-sm text-yellow-600 font-semibold">Outstanding: {formatCurrency(loan.amount - (loanRepayments.get(loan.id) || 0))}</p>
                                  </div>
                                  <ChevronRight className="h-4 w-4" />
                                  </Button>
                              </li>
                              ))}
                          </ul>
                          ) : (
                          <p className="text-center text-muted-foreground">You have no active loans to repay.</p>
                          )}
                          </div>
                      )}
                  </DialogContent>
              </Dialog>
            </>
          )}
        </form>
      </div>

       <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          {editingEntry && (
            <>
              <DialogHeader>
                  <DialogTitle>Edit Entry</DialogTitle>
              </DialogHeader>
              <EditEntryForm entry={editingEntry} onFinished={(updatedEntry) => handleEditFinished(editingEntry, updatedEntry)} />
            </>
          )}
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete this entry and update your account balances.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );

    