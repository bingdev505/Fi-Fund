
'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Bot, Loader2, Send, User, Paperclip, ArrowUpCircle, ArrowDownCircle, PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { routeUserIntent } from '@/app/actions';
import { useFinancials } from '@/hooks/useFinancials';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import type { ChatMessage as ChatMessageType, Debt, Transaction } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from './ui/dialog';
import RepaymentForm from './RepaymentForm';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import EditEntryForm from './EditEntryForm';
import EntryForm from './EntryForm';

const CHAT_CONTEXT_TIMEOUT_MINUTES = 5;

// Hook to manage chat history in local storage
const useChatHistory = () => {
    const { user } = useUser();
    const storageKey = user ? `financeflow_chat_${user.uid}` : null;
    const [messages, setMessages] = useState<ChatMessageType[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (storageKey) {
            setIsLoading(true);
            try {
                const storedMessages = JSON.parse(localStorage.getItem(storageKey) || '[]');
                setMessages(storedMessages);
            } catch (e) {
                setMessages([]);
            } finally {
                setIsLoading(false);
            }
        } else {
            setMessages([]);
            setIsLoading(false);
        }
    }, [storageKey]);

    const addMessage = (message: Omit<ChatMessageType, 'id' | 'timestamp'>) => {
        const newMessage: ChatMessageType = {
            ...message,
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
        };

        setMessages(prevMessages => {
            const updatedMessages = [...prevMessages, newMessage];
            if (storageKey) {
                localStorage.setItem(storageKey, JSON.stringify(updatedMessages));
            }
            return updatedMessages;
        });
        return newMessage;
    };

    const updateMessage = (updatedMessage: ChatMessageType) => {
        setMessages(prevMessages => {
            const updatedMessages = prevMessages.map(msg => msg.id === updatedMessage.id ? updatedMessage : msg);
            if (storageKey) {
                localStorage.setItem(storageKey, JSON.stringify(updatedMessages));
            }
            return updatedMessages;
        });
    };

    const deleteMessage = (messageId: string) => {
        setMessages(prevMessages => {
            const updatedMessages = prevMessages.filter(msg => msg.id !== messageId);
            if (storageKey) {
                localStorage.setItem(storageKey, JSON.stringify(updatedMessages));
            }
            return updatedMessages;
        });
    };
    
    return { messages, addMessage, updateMessage, deleteMessage, isLoading };
};


export default function AIChat() {
  const { user } = useUser();
  const [input, setInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const { 
    addTransaction, 
    addDebt, 
    currency, 
    transactions, 
    debts, 
    bankAccounts,
    getTransactionById,
    getDebtById,
    deleteTransaction,
    deleteDebt,
    updateTransaction,
    updateDebt,
  } = useFinancials();
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const { messages, addMessage, updateMessage, deleteMessage, isLoading: isMessagesLoading } = useChatHistory();

  const [editingEntry, setEditingEntry] = useState<Transaction | Debt | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<Transaction | Debt | null>(null);

  const [repaymentPopoverOpen, setRepaymentPopoverOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [repaymentDialogOpen, setRepaymentDialogOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);

  const { debtors, creditors } = useMemo(() => {
    return {
      debtors: debts.filter(d => d.type === 'debtor' && d.amount > 0),
      creditors: debts.filter(d => d.type === 'creditor' && d.amount > 0),
    }
  }, [debts]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) {
        setTimeout(() => {
          viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
        }, 100);
      }
    }
  }, [messages, isAiLoading]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
  };
  
  const handleQuickAction = (action: string, type: 'bank' | 'prefix') => {
    if (type === 'bank') {
        setInput(prev => `${prev} in ${action}`);
    } else {
        setInput(prev => `${action} ${prev}`);
    }
    setQuickActionsOpen(false);
    document.getElementById('chat-input')?.focus();
  };

  const handleRepaymentSelect = (debt: Debt) => {
    setSelectedDebt(debt);
    setRepaymentDialogOpen(true);
    setRepaymentPopoverOpen(false);
  };
  
  const handleRepaymentFinished = () => {
    setRepaymentDialogOpen(false);
    setSelectedDebt(null);
  };

  const handleEditClick = (message: ChatMessageType) => {
    if (!message.transactionId) return;
    
    const entry = getDebtById(message.transactionId) || getTransactionById(message.transactionId);

    if (entry) {
        setEditingEntry(entry);
    }
  };

  const handleDelete = () => {
    if (!deletingEntry) return;

    const messageToDelete = messages.find(m => m.transactionId === deletingEntry?.id);

    if ('category' in deletingEntry) {
      deleteTransaction(deletingEntry as Transaction);
      toast({ title: "Transaction Deleted" });
    } else {
      deleteDebt(deletingEntry as Debt);
      toast({ title: "Debt Deleted" });
    }

    if (messageToDelete) {
        deleteMessage(messageToDelete.id);
    }

    setDeletingEntry(null);
  };

  const handleEditFinished = (originalEntry: Transaction | Debt, updatedEntry: Transaction | Debt) => {
    const messageToUpdate = messages.find(m => m.transactionId === originalEntry.id);
    if (messageToUpdate) {
        let newContent = '';
        if (updatedEntry.type === 'income' || updatedEntry.type === 'expense') {
            const tx = updatedEntry as Transaction;
            const accountName = bankAccounts.find(ba => ba.id === tx.accountId)?.name || 'an account';
            newContent = `${tx.type.charAt(0).toUpperCase() + tx.type.slice(1)} of ${formatCurrency(tx.amount)} in ${tx.category} logged to ${accountName}.`
        } else {
            const debt = updatedEntry as Debt;
            const accountName = bankAccounts.find(ba => ba.id === debt.accountId)?.name || 'an account';
            newContent = `${debt.type.charAt(0).toUpperCase() + debt.type.slice(1)} of ${formatCurrency(debt.amount)} for ${debt.name} logged against ${accountName}.`
        }

        updateMessage({ ...messageToUpdate, content: newContent });
    }
    setEditingEntry(null);
  };


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isAiLoading) return;

    const userMessageContent = input;
    setInput('');

    addMessage({
      role: 'user',
      content: userMessageContent,
    });

    setIsAiLoading(true);

    try {
      const financialData = JSON.stringify({ transactions, debts, bankAccounts });
      
      let chatHistoryForContext = '';
      const lastMessage = messages[messages.length - 1];

      if (lastMessage?.timestamp) {
        const lastMessageDate = new Date(lastMessage.timestamp);
        const now = new Date();
        const timeDiffMinutes = (now.getTime() - lastMessageDate.getTime()) / (1000 * 60);

        if (timeDiffMinutes < CHAT_CONTEXT_TIMEOUT_MINUTES) {
          chatHistoryForContext = messages
            .slice(-4)
            .map(msg => `${msg.role}: ${msg.content}`)
            .join('\n');
        }
      }

      const result = await routeUserIntent({ 
        chatInput: userMessageContent, 
        financialData,
        chatHistory: chatHistoryForContext
      });

      let assistantResponse = '';
      let newEntryId: string | undefined;
      let newEntryType: 'income' | 'expense' | 'creditor' | 'debtor' | undefined;

      if (result.intent === 'logData') {
        const logResult = result.result;
        
        let accountIdToUse: string | undefined;
        let accountNameToUse: string | undefined;
        let wasAccountFound = false;

        if (logResult.accountName) {
            const searchName = logResult.accountName.toLowerCase();
            const foundAccount = bankAccounts.find(acc => acc.name.toLowerCase().includes(searchName));
            
            if (foundAccount) {
                accountIdToUse = foundAccount.id;
                accountNameToUse = foundAccount.name;
                wasAccountFound = true;
            } else {
                assistantResponse = `I couldn't find an account named '${logResult.accountName}'. Please check your account settings or try again.`;
            }
        } else {
            const primaryAccount = bankAccounts.find(acc => acc.isPrimary);
            if (primaryAccount) {
                accountIdToUse = primaryAccount.id;
                accountNameToUse = primaryAccount.name;
                wasAccountFound = true;
            }
        }

        if (wasAccountFound) {
             if (!accountIdToUse) {
                toast({
                  variant: 'destructive',
                  title: 'No Account Available',
                  description: 'Please set a primary bank account in settings, or specify an account in your message.',
                });
                assistantResponse = "I couldn't log that because there's no primary account set. Please go to settings to select one, or tell me which account to use.";
            } else if (logResult.transactionType === 'income' || logResult.transactionType === 'expense') {
                const newTransaction = {
                    type: logResult.transactionType,
                    amount: logResult.amount,
                    category: logResult.category,
                    description: logResult.description || 'AI Logged Transaction',
                    accountId: accountIdToUse,
                };
                const newDocRef = await addTransaction(newTransaction, true);
                newEntryId = newDocRef?.id;
                newEntryType = newTransaction.type;
                
                const toastDescription = `${logResult.transactionType.charAt(0).toUpperCase() + logResult.transactionType.slice(1)} of ${formatCurrency(logResult.amount)} in ${logResult.category} logged to ${accountNameToUse}.`;
                assistantResponse = toastDescription;
                toast({
                    title: 'Logged via AI Chat',
                    description: toastDescription,
                });
            } else { // creditor or debtor
                const newDebt = {
                    type: logResult.transactionType,
                    amount: logResult.amount,
                    name: logResult.category,
                    description: logResult.description || 'AI Logged Debt',
                    accountId: accountIdToUse
                };
                const newDocRef = await addDebt(newDebt, true);
                newEntryId = newDocRef?.id;
                newEntryType = newDebt.type;

                const toastDescription = `${logResult.transactionType.charAt(0).toUpperCase() + logResult.transactionType.slice(1)} of ${formatCurrency(logResult.amount)} for ${logResult.category} logged against ${accountNameToUse}.`;
                assistantResponse = toastDescription;
                toast({
                    title: 'Logged via AI Chat',
                    description: toastDescription,
                });
            }
        }
      } else if (result.intent === 'question') {
        assistantResponse = result.result.answer;
      } else { // intent is 'command'
        assistantResponse = result.result.response;
      }

      const assistantMessage: Partial<ChatMessageType> = {
        role: 'assistant',
        content: assistantResponse,
      };

      if (newEntryId && newEntryType) {
        assistantMessage.transactionId = newEntryId;
        assistantMessage.entryType = newEntryType;
      }

      addMessage(assistantMessage as Omit<ChatMessageType, 'id' | 'timestamp'>);

    } catch (error) {
      console.error('AI Chat Error:', error);
      addMessage({
        role: 'assistant',
        content: "Sorry, I couldn't understand that. Please try rephrasing, for example: 'Lunch for 250 rupees' or 'What is my total income?'.",
      });
    } finally {
      setIsAiLoading(false);
    }
  };
  
  const renderRepaymentContent = () => {
    return (
        <Command>
            <CommandInput placeholder="Search debts..." />
            <CommandList>
            {(creditors.length === 0 && debtors.length === 0) && <div className="p-4 text-sm text-muted-foreground">No outstanding debts found.</div>}
            {creditors.length > 0 && (
                <CommandGroup heading="You Owe (Creditors)">
                {creditors.map((debt) => (
                    <CommandItem key={debt.id} onSelect={() => handleRepaymentSelect(debt)}>
                    <div className="flex justify-between w-full">
                        <span>{debt.name}</span>
                        <span className="text-red-600">{formatCurrency(debt.amount)}</span>
                    </div>
                    </CommandItem>
                ))}
                </CommandGroup>
            )}
            {debtors.length > 0 && (
                <CommandGroup heading="They Owe You (Debtors)">
                {debtors.map((debt) => (
                    <CommandItem key={debt.id} onSelect={() => handleRepaymentSelect(debt)}>
                    <div className="flex justify-between w-full">
                        <span>{debt.name}</span>
                        <span className="text-green-600">{formatCurrency(debt.amount)}</span>
                    </div>
                    </CommandItem>
                ))}
                </CommandGroup>
            )}
            </CommandList>
        </Command>
    );
  };

  const quickActions = [
    ...bankAccounts.filter(acc => !acc.isPrimary).map(acc => ({ label: acc.name, action: acc.name, type: 'bank' as const })),
    { label: 'Creditor', action: 'creditor', type: 'prefix' as const },
    { label: 'Debtor', action: 'debtor', type: 'prefix' as const },
    { label: 'Income', action: 'income', type: 'prefix' as const },
    { label: 'Expense', action: 'expense', type: 'prefix' as const },
  ];

  return (
    <Dialog open={repaymentDialogOpen} onOpenChange={setRepaymentDialogOpen}>
    <Dialog open={isTransactionFormOpen} onOpenChange={setIsTransactionFormOpen}>
    <AlertDialog onOpenChange={(isOpen) => !isOpen && setDeletingEntry(null)}>
    <Dialog onOpenChange={(isOpen) => !isOpen && setEditingEntry(null)}>
      <div className="absolute inset-0 flex flex-col bg-muted/40">
        <ScrollArea className="flex-1 p-4 no-scrollbar" ref={scrollAreaRef}>
          <div className="space-y-4 pr-4">
            {(isMessagesLoading || !messages) && messages?.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                  <Bot className="h-12 w-12 mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Welcome to FinanceFlow AI</h2>
                  <p>You can start by logging a transaction like 'Spent 500 on groceries in savings'</p>
                  <p>or ask a question like 'What's my total income this month?'</p>
              </div>
            )}
            {messages && messages.map(message => (
              <div key={message.id} className={cn('flex items-start gap-3 group/message', message.role === 'user' ? 'justify-end' : '')}>
                {message.role === 'assistant' && (
                  <Avatar className="h-8 w-8 border bg-white">
                    <AvatarFallback className="bg-transparent"><Bot className="text-primary" /></AvatarFallback>
                  </Avatar>
                )}
                <div className={cn('rounded-lg px-3 py-2 max-w-[75%] shadow-sm text-sm relative', message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-white text-foreground')}>
                   {message.transactionId && (
                    <div className="absolute top-1/2 -translate-y-1/2 -left-20 opacity-0 group-hover/message:opacity-100 transition-opacity flex items-center bg-white rounded-full border shadow-sm">
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => handleEditClick(message)}>
                            <Pencil className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => setDeletingEntry(getDebtById(message.transactionId!) || getTransactionById(message.transactionId!))}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                      </AlertDialogTrigger>
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
            {isAiLoading && (
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8 border bg-white">
                  <AvatarFallback className="bg-transparent"><Bot className="text-primary" /></AvatarFallback>
                </Avatar>
                <div className="rounded-lg px-4 py-2 bg-white flex items-center shadow-sm">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="p-4 border-t bg-card">
          <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
             <Popover open={quickActionsOpen} onOpenChange={setQuickActionsOpen}>
                <PopoverTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" className="flex-shrink-0 rounded-full">
                        <PlusCircle className="h-5 w-5 text-muted-foreground" />
                        <span className="sr-only">Quick Actions</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent side="top" align="start" className="w-auto p-2">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                        {quickActions.map(({ label, action, type }) => (
                        <Button
                            key={action}
                            variant="outline"
                            size="sm"
                            className="rounded-full text-xs h-7 px-3 flex-shrink-0"
                            onClick={() => handleQuickAction(action, type)}
                        >
                            {label}
                        </Button>
                        ))}
                    </div>
                </PopoverContent>
            </Popover>

            <Popover open={repaymentPopoverOpen} onOpenChange={setRepaymentPopoverOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="flex-shrink-0 rounded-full">
                  <Paperclip className="h-5 w-5 text-muted-foreground" />
                  <span className="sr-only">Log Repayment</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                side="top" 
                align="start"
                className="w-auto p-0"
                >
                {renderRepaymentContent()}
              </PopoverContent>
            </Popover>
            <Input
                id="chat-input"
                value={input}
                onChange={handleInputChange}
                placeholder="Type your message..."
                disabled={isAiLoading || isMessagesLoading}
                autoComplete='off'
                className="flex-1 rounded-full bg-background"
            />
            {input.trim() ? (
              <Button type="submit" size="icon" disabled={isAiLoading || isMessagesLoading} className="rounded-full flex-shrink-0">
                <Send className="h-4 w-4" />
                <span className="sr-only">Send</span>
              </Button>
            ) : (
                <DialogTrigger asChild>
                    <Button type="button" size="icon" className="rounded-full flex-shrink-0">
                        <PlusCircle className="h-4 w-4" />
                        <span className="sr-only">Add Transaction</span>
                    </Button>
              </DialogTrigger>
            )}
          </form>
        </div>
      </div>
       {editingEntry && (
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Edit Entry</DialogTitle>
              </DialogHeader>
              <EditEntryForm entry={editingEntry} onFinished={(updatedEntry) => handleEditFinished(editingEntry, updatedEntry)} />
          </DialogContent>
      )}
      {deletingEntry && (
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete this entry and update your account balances.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      )}
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Add a New Transaction</DialogTitle>
            </DialogHeader>
            <EntryForm onFinished={() => setIsTransactionFormOpen(false)} />
        </DialogContent>
    </Dialog>
    </AlertDialog>
      {selectedDebt && (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Log a Repayment</DialogTitle>
                <DialogDescription>
                    Log a full or partial payment for this debt. This will update the outstanding balance.
                </DialogDescription>
            </DialogHeader>
            <RepaymentForm debt={selectedDebt} onFinished={handleRepaymentFinished} />
        </DialogContent>
      )}
    </Dialog>
    </Dialog>
  );
}
