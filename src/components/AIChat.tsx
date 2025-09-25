'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Loader2, Send, User, Paperclip } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { routeUserIntent } from '@/app/actions';
import { useFinancials } from '@/hooks/useFinancials';
import { useToast } from '@/hooks/use-toast';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([
    { id: crypto.randomUUID(), role: 'assistant', content: "Hello! How can I help you manage your finances today? You can log transactions like 'Paid 500 for groceries' or ask questions like 'What is my total income?'." }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { addTransaction, addDebt, currency, transactions, debts, bankAccounts } = useFinancials();
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
  }

  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
    if (viewport) {
        viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setInput('');

    try {
      const financialData = JSON.stringify({ transactions, debts, bankAccounts });
      const result = await routeUserIntent({ chatInput: input, financialData });
      
      let assistantResponse = '';
      if(result.intent === 'logData') {
        const logResult = result.result;
        let toastDescription = '';
        if(logResult.transactionType === 'income' || logResult.transactionType === 'expense') {
          addTransaction({
              type: logResult.transactionType,
              amount: logResult.amount,
              category: logResult.category,
              description: logResult.description || 'AI Logged Transaction'
          });
          toastDescription = `${logResult.transactionType} of ${formatCurrency(logResult.amount)} in ${logResult.category} logged.`
        } else {
          addDebt({
              type: logResult.transactionType,
              amount: logResult.amount,
              name: logResult.category, // AI might put name in category for debts
              description: logResult.description || 'AI Logged Debt'
          });
          toastDescription = `${logResult.transactionType} of ${formatCurrency(logResult.amount)} for ${logResult.category} logged.`
        }
        assistantResponse = `I've logged that for you! ${toastDescription}`;
        toast({
          title: "Logged via AI Chat",
          description: toastDescription,
        });
      } else { // intent is 'question'
        assistantResponse = result.result.answer;
      }


      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: assistantResponse,
      };
      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error("AI Chat Error:", error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "Sorry, I couldn't understand that. Please try rephrasing, for example: 'Lunch for 250 rupees' or 'What is my total income?'.",
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-muted/40">
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-4 pr-4">
            {messages.map(message => (
              <div key={message.id} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                {message.role === 'assistant' && (
                   <Avatar className="h-8 w-8 border bg-white">
                     <AvatarFallback className="bg-transparent"><Bot className="text-primary"/></AvatarFallback>
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
                    <AvatarFallback className="bg-transparent"><Bot className="text-primary"/></AvatarFallback>
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
           <Button type="button" variant="ghost" size="icon">
            <Paperclip className="h-5 w-5 text-muted-foreground" />
            <span className="sr-only">Attach file</span>
          </Button>
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            autoComplete='off'
            className="flex-1 rounded-full bg-background"
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="rounded-full">
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
