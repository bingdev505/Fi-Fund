'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Bot, Loader2, Send, User, Paperclip, PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { routeUserIntent } from '@/app/actions';
import { useFinancials } from '@/hooks/useFinancials';
import { useToast } from '@/hooks/use-toast';
import type { ChatMessage, Loan, Transaction, Contact } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import EditEntryForm from './EditEntryForm';
import EntryForm from './EntryForm';
import { useAuth } from '@/context/AuthContext';

const CHAT_CONTEXT_TIMEOUT_MINUTES = 5;

// Hook to manage chat history in local storage
const useChatHistory = () => {
    const { user } = useAuth();
    const storageKey = user ? `financeflow_chat_${user.id}` : null;
    const [messages, setMessages] = useState<ChatMessage[]>([]);
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

    const addMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
        const newMessage: ChatMessage = {
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

    const updateMessage = (updatedMessage: ChatMessage) => {
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
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const { 
    addTransaction, 
    addLoan,
    currency, 
    transactions, 
    loans, 
    bankAccounts,
    contacts,
    addContact,
    getTransactionById,
    getLoanById,
    deleteTransaction,
    deleteLoan,
    activeProject
  } = useFinancials();
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const { messages, addMessage, updateMessage, deleteMessage, isLoading: isMessagesLoading } = useChatHistory();

  const [editingEntry, setEditingEntry] = useState<Transaction | Loan | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<Transaction | Loan | null>(null);

  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);


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

  const handleEditClick = (message: ChatMessage) => {
    if (!message.transaction_id) return;
    
    const entry = getLoanById(message.transaction_id) || getTransactionById(message.transaction_id);

    if (entry) {
        setEditingEntry(entry);
    }
  };

  const handleDelete = () => {
    if (!deletingEntry) return;

    const messageToDelete = messages.find(m => m.transaction_id === deletingEntry?.id);

    if ('category' in deletingEntry) {
      deleteTransaction(deletingEntry as Transaction);
      toast({ title: "Transaction Deleted" });
    } else {
      deleteLoan((deletingEntry as Loan).id);
      toast({ title: "Loan Deleted" });
    }

    if (messageToDelete) {
        deleteMessage(messageToDelete.id);
    }

    setDeletingEntry(null);
  };

  const handleEditFinished = (originalEntry: Transaction | Loan, updatedEntry: Transaction | Loan) => {
    const messageToUpdate = messages.find(m => m.transaction_id === originalEntry.id);
    if (messageToUpdate) {
        let newContent = '';
        if (updatedEntry.type === 'income' || updatedEntry.type === 'expense') {
            const tx = updatedEntry as Transaction;
            const accountName = bankAccounts.find(ba => ba.id === tx.account_id)?.name || 'an account';
            newContent = `${tx.type.charAt(0).toUpperCase() + tx.type.slice(1)} of ${formatCurrency(tx.amount)} in ${tx.category} logged to ${accountName}.`
        } else {
            const loan = updatedEntry as Loan;
            const accountName = bankAccounts.find(ba => ba.id === loan.account_id)?.name || 'an account';
            newContent = `${loan.type.charAt(0).toUpperCase() + loan.type.slice(1)} of ${formatCurrency(loan.amount)} for ${contacts.find(c => c.id === loan.contact_id)?.name} logged against ${accountName}.`
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
      const financialData = JSON.stringify({
        businessName: activeProject?.name || 'Personal',
        transactions,
        loans,
        bankAccounts,
      });
      
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
        chat_input: userMessageContent, 
        financial_data: financialData,
        chat_history: chatHistoryForContext
      });

      let assistantResponse = '';
      let newEntryId: string | undefined;
      let newEntryType: 'income' | 'expense' | 'loanGiven' | 'loanTaken' | undefined;

      if (result.intent === 'logData') {
        const logResult = result.result;
        
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
                assistantResponse = `I couldn't find an account named '${logResult.account_name}'. Please check your account settings or try again.`;
            }
        } else {
            const primaryAccount = bankAccounts.find(acc => acc.is_primary);
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
            } else if (logResult.transaction_type === 'income' || logResult.transaction_type === 'expense') {
                const newTransaction = {
                    type: logResult.transaction_type,
                    amount: logResult.amount,
                    category: logResult.category,
                    description: logResult.description || 'AI Logged Transaction',
                    account_id: accountIdToUse,
                };
                const newDocRef = await addTransaction(newTransaction, true);
                newEntryId = (newDocRef as {id: string})?.id;
                newEntryType = newTransaction.type;
                
                const toastDescription = `${logResult.transaction_type.charAt(0).toUpperCase() + logResult.transaction_type.slice(1)} of ${formatCurrency(logResult.amount)} in ${logResult.category} logged to ${accountNameToUse}.`;
                assistantResponse = toastDescription;
                toast({
                    title: 'Logged via AI Chat',
                    description: toastDescription,
                });
            } else { // loanGiven or loanTaken
                let contact: Contact | undefined = contacts.find(c => c.name.toLowerCase() === logResult.contact_id.toLowerCase());
                if (!contact) {
                    contact = await addContact({ name: logResult.contact_id });
                }

                const newLoan = {
                    type: logResult.transaction_type,
                    amount: logResult.amount,
                    contact_id: contact.id, 
                    description: logResult.description || 'AI Logged Loan',
                    account_id: accountIdToUse,
                    status: 'active'
                };
                await addLoan(newLoan);
                // We don't get the ID back from addLoan easily, so can't set newEntryId here.
                
                const toastDescription = `${logResult.transaction_type.charAt(0).toUpperCase() + logResult.transaction_type.slice(1)} of ${formatCurrency(logResult.amount)} for ${contact.name} logged against ${accountNameToUse}.`;
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

      const assistantMessage: Partial<ChatMessage> = {
        role: 'assistant',
        content: assistantResponse,
      };

      if (newEntryId && newEntryType) {
        assistantMessage.transaction_id = newEntryId;
        assistantMessage.entry_type = newEntryType;
      }

      addMessage(assistantMessage as Omit<ChatMessage, 'id' | 'timestamp'>);

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

  const quickActions = [
    ...bankAccounts.filter(acc => !acc.is_primary).map(acc => ({ label: acc.name, action: acc.name, type: 'bank' as const })),
    { label: 'Loan Given', action: 'loan given', type: 'prefix' as const },
    { label: 'Loan Taken', action: 'loan taken', type: 'prefix' as const },
    { label: 'Income', action: 'income', type: 'prefix' as const },
    { label: 'Expense', action: 'expense', type: 'prefix' as const },
  ];

  return (
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
                   {message.transaction_id && (
                    <div className="absolute top-1/2 -translate-y-1/2 -left-20 opacity-0 group-hover/message:opacity-100 transition-opacity flex items-center bg-white rounded-full border shadow-sm">
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => handleEditClick(message)}>
                            <Pencil className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => setDeletingEntry(getLoanById(message.transaction_id!) || getTransactionById(message.transaction_id!))}>
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
    </Dialog>
  );
}
