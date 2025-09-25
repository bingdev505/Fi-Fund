'use client';

import { useFinancials } from '@/hooks/useFinancials';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, TrendingDown } from 'lucide-react';

type TransactionListProps = {
  type: 'income' | 'expense';
};

export default function TransactionList({ type }: TransactionListProps) {
  const { transactions } = useFinancials();
  const filteredTransactions = transactions.filter(t => t.type === type).slice(0, 10); // Show last 10

  if (filteredTransactions.length === 0) {
    return (
      <Card className="flex h-full items-center justify-center min-h-[200px] md:min-h-0">
        <CardContent className="text-center text-muted-foreground p-6">
          <p>No {type}s recorded yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ScrollArea className="h-full max-h-[370px] rounded-md border">
      <div className="p-4">
        {filteredTransactions.map((transaction, index) => (
          <div key={transaction.id}>
            <div className="flex items-start justify-between py-3">
                <div className="flex items-center gap-4">
                    {type === 'income' ? <TrendingUp className="h-6 w-6 text-primary" /> : <TrendingDown className="h-6 w-6 text-destructive" />}
                    <div>
                        <p className="text-sm font-medium leading-none">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">{transaction.category} &bull; {transaction.date.toLocaleDateString()}</p>
                    </div>
                </div>
                <div className={`font-semibold text-right ${type === 'income' ? 'text-primary' : 'text-destructive'}`}>
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(transaction.amount)}
                </div>
            </div>
            {index < filteredTransactions.length - 1 && <Separator />}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
