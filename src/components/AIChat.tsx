'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Bot, Loader2, Send, User, Paperclip, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { routeUserIntent } from '@/app/actions';
import { useFinancials } from '@/hooks/useFinancials';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useUser } from '@/firebase';
import {
  collection,
  serverTimestamp,
  Timestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { ChatMessage as ChatMessageType, Debt } from '@/lib/types';
import { useMemoFirebase } from '@/firebase/provider';
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from '@/components/ui/popover';
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import RepaymentForm from './RepaymentForm';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

export default function AIChat() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { addTransaction, addDebt, currency, transactions, debts, bankAccounts } = useFinancials();
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isBankPopoverOpen, setIsBankPopoverOpen] = useState(false);

  const [repaymentPopoverOpen, setRepaymentPopoverOpen] = useState(false);
  const [repaymentStep, setRepaymentStep] = useState<'select_type' | 'select_debtor' | 'select_creditor'>('select_type');
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [repaymentDialogOpen, setRepaymentDialogOpen] = useState(false);

  const chatHistoryRef = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'chatHistory') : null),
    [firestore, user]
  );

  const chatHistoryQuery = useMemoFirebase(
    () => (chatHistoryRef ? query(chatHistoryRef, orderBy('timestamp', 'asc')) : null),
    [chatHistoryRef]
  );
  
  const { data: messages, isLoading: isMessagesLoading } = useCollection<ChatMessageType>(chatHistoryQuery);

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
  }, [messages, isLoading]);

  useEffect(() => {
    if (!repaymentPopoverOpen) {
      // Reset state when the main popover is closed
      setTimeout(() => setRepaymentStep('select_type'), 150);
    }
  }, [repaymentPopoverOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    if (value.endsWith('@') && !value.endsWith(' @')) {
      setIsBankPopoverOpen(true);
    } else {
      setIsBankPopoverOpen(false);
    }
  };

  const handleBankSelect = (bankName: string) => {
    setInput(input.slice(0, -1) + bankName + ' ');
    setIsBankPopoverOpen(false);
  };

  const handleRepaymentSelect = (debt: Debt) => {
    setSelectedDebt(debt);
    setRepaymentDialogOpen(true);
    setRepaymentPopoverOpen(false); // Close the selection popover
  };
  
  const handleRepaymentFinished = () => {
    setRepaymentDialogOpen(false);
    setSelectedDebt(null);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !chatHistoryRef || !messages) return;

    const userMessageContent = input;
    setInput('');
    setIsBankPopoverOpen(false);


    addDocumentNonBlocking(chatHistoryRef, {
      role: 'user',
      content: userMessageContent,
      timestamp: serverTimestamp() as Timestamp,
    });

    setIsLoading(true);

    try {
      const financialData = JSON.stringify({ transactions, debts, bankAccounts });
      
      const chatHistoryForContext = messages
        .slice(-4)
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      const result = await routeUserIntent({ 
        chatInput: userMessageContent, 
        financialData,
        chatHistory: chatHistoryForContext
      });

      let assistantResponse = '';
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
                addTransaction({
                    type: logResult.transactionType,
                    amount: logResult.amount,
                    category: logResult.category,
                    description: logResult.description || 'AI Logged Transaction',
                    accountId: accountIdToUse,
                });
                const toastDescription = `${logResult.transactionType} of ${formatCurrency(logResult.amount)} in ${logResult.category} logged to ${accountNameToUse}.`;
                assistantResponse = `I've logged that for you! ${toastDescription}`;
                toast({
                    title: 'Logged via AI Chat',
                    description: toastDescription,
                });
            } else { // creditor or debtor
                addDebt({
                    type: logResult.transactionType,
                    amount: logResult.amount,
                    name: logResult.category,
                    description: logResult.description || 'AI Logged Debt',
                    accountId: accountIdToUse
                });
                const toastDescription = `${logResult.transactionType} of ${formatCurrency(logResult.amount)} for ${logResult.category} logged against ${accountNameToUse}.`;
                assistantResponse = `I've logged that for you! ${toastDescription}`;
                toast({
                    title: 'Logged via AI Chat',
                    description: toastDescription,
                });
            }
        }
      } else { // intent is 'question'
        assistantResponse = result.result.answer;
      }

      addDocumentNonBlocking(chatHistoryRef, {
        role: 'assistant',
        content: assistantResponse,
        timestamp: serverTimestamp() as Timestamp,
      });

    } catch (error) {
      console.error('AI Chat Error:', error);
      addDocumentNonBlocking(chatHistoryRef, {
        role: 'assistant',
        content: "Sorry, I couldn't understand that. Please try rephrasing, for example: 'Lunch for 250 rupees' or 'What is my total income?'.",
        timestamp: serverTimestamp() as Timestamp,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const renderRepaymentContent = () => {
    switch(repaymentStep) {
      case 'select_creditor':
        return (
          <Command>
            <CommandInput placeholder="Search creditors..." />
            <CommandList>
              {creditors.length === 0 && <div className="p-4 text-sm text-muted-foreground">No creditors found.</div>}
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
            </CommandList>
          </Command>
        );
      case 'select_debtor':
        return (
          <Command>
            <CommandInput placeholder="Search debtors..." />
            <CommandList>
              {debtors.length === 0 && <div className="p-4 text-sm text-muted-foreground">No debtors found.</div>}
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
            </CommandList>
          </Command>
        );
      case 'select_type':
      default:
        return (
          <TooltipProvider>
            <div className="p-2 flex justify-center items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-16 h-16" onClick={() => setRepaymentStep('select_creditor')}>
                    <ArrowUpCircle className="h-8 w-8 text-red-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Pay Someone Back (Creditor)</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-16 h-16" onClick={() => setRepaymentStep('select_debtor')}>
                    <ArrowDownCircle className="h-8 w-8 text-green-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Receive a Payment (Debtor)</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        )
    }
  };

  return (
    <Dialog open={repaymentDialogOpen} onOpenChange={setRepaymentDialogOpen}>
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
              <div key={message.id} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                {message.role === 'assistant' && (
                  <Avatar className="h-8 w-8 border bg-white">
                    <AvatarFallback className="bg-transparent"><Bot className="text-primary" /></AvatarFallback>
                  </Avatar>
                )}
                <div className={`rounded-lg px-3 py-2 max-w-[75%] shadow-sm text-sm ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-white text-foreground'}`}>
                  <p>{message.content}</p>
                </div>
                {message.role === 'user' && (
                  <Avatar className="h-8 w-8 border">
                    <AvatarFallback><User /></AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isLoading && (
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
            <Popover open={repaymentPopoverOpen} onOpenChange={setRepaymentPopoverOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="ghost" size="icon">
                  <Paperclip className="h-5 w-5 text-muted-foreground" />
                  <span className="sr-only">Log Repayment</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                {renderRepaymentContent()}
              </PopoverContent>
            </Popover>

            <Popover open={isBankPopoverOpen} onOpenChange={setIsBankPopoverOpen}>
              <PopoverAnchor asChild>
                <Input
                    value={input}
                    onChange={handleInputChange}
                    placeholder="Type your message..."
                    disabled={isLoading || isMessagesLoading}
                    autoComplete='off'
                    className="flex-1 rounded-full bg-background"
                />
              </PopoverAnchor>
              {bankAccounts.length > 0 && (
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                      <CommandList>
                          <CommandGroup heading="Your Bank Accounts">
                          {bankAccounts.map((account) => (
                              <CommandItem
                              key={account.id}
                              onSelect={() => handleBankSelect(account.name)}
                              >
                              {account.name}
                              </CommandItem>
                          ))}
                          </CommandGroup>
                      </CommandList>
                      </Command>
                  </PopoverContent>
              )}
            </Popover>
            <Button type="submit" size="icon" disabled={isLoading || isMessagesLoading || !input.trim()} className="rounded-full">
              <Send className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </div>
      </div>
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
  );
}
