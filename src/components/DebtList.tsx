'use client';

import { useFinancials } from '@/hooks/useFinancials';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Landmark, User } from 'lucide-react';

type DebtListProps = {
  type: 'creditor' | 'debtor';
};

export default function DebtList({ type }: DebtListProps) {
  const { debts } = useFinancials();
  const filteredDebts = debts.filter(d => d.type === type).slice(0, 10);

  if (filteredDebts.length === 0) {
    return (
      <Card className="flex h-full items-center justify-center">
        <CardContent className="text-center text-muted-foreground p-6">
          <p>No {type}s recorded yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ScrollArea className="h-[435px] rounded-md border">
      <div className="p-4">
        {filteredDebts.map((debt, index) => (
          <div key={debt.id}>
            <div className="flex items-start justify-between py-3">
              <div className="flex items-center gap-4">
                <div className="text-muted-foreground">
                  {type === 'creditor' ? <Landmark className="h-6 w-6" /> : <User className="h-6 w-6" />}
                </div>
                <div>
                  <p className="text-sm font-medium leading-none">{debt.name}</p>
                  <p className="text-sm text-muted-foreground">{debt.description}</p>
                  {debt.dueDate && <p className="text-xs text-muted-foreground">Due: {debt.dueDate.toLocaleDateString()}</p>}
                </div>
              </div>
              <div className={`font-semibold ${type === 'creditor' ? 'text-destructive' : 'text-primary'}`}>
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(debt.amount)}
              </div>
            </div>
            {index < filteredDebts.length - 1 && <Separator />}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
