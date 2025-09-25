'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Loader2, Send, User, Paperclip } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { logFinancialData } from '@/app/actions';
import { useFinancials } from '@/hooks/useFinancials';
import { useToast } from '@/hooks/use-toast';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([
    { id: crypto.randomUUID(), role: 'assistant', content: "Hello! How can I help you manage your finances today? Try 'Paid 500 for groceries' or 'Got my salary of 50000'." }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { addTransaction, addDebt } = useFinancials();
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

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
      const result = await logFinancialData({ chatInput: input });
      
      let toastDescription = '';
      if(result.transactionType === 'income' || result.transactionType === 'expense') {
        addTransaction({
            type: result.transactionType,
            amount: result.amount,
            category: result.category,
            description: result.description || 'AI Logged Transaction'
        });
        toastDescription = `${result.transactionType} of ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(result.amount)} in ${result.category} logged.`
      } else {
        addDebt({
            type: result.transactionType,
            amount: result.amount,
            name: result.category, // AI might put name in category for debts
            description: result.description || 'AI Logged Debt'
        });
        toastDescription = `${result.transactionType} of ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(result.amount)} for ${result.category} logged.`
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `I've logged that for you! ${toastDescription}`,
      };
      setMessages(prev => [...prev, assistantMessage]);
      toast({
        title: "Logged via AI Chat",
        description: toastDescription,
      });

    } catch (error) {
      console.error("AI Chat Error:", error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "Sorry, I couldn't understand that. Please try rephrasing, for example: 'Lunch for 250 rupees' or 'Received 5000 from freelance work'.",
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
