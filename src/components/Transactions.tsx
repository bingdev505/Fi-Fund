'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import TransactionForm from './TransactionForm';
import TransactionList from './TransactionList';

export default function Transactions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="expenses" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
          </TabsList>
          <TabsContent value="expenses">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="text-lg font-semibold mb-4 font-headline">Add Expense</h3>
                <TransactionForm type="expense" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4 font-headline">Recent Expenses</h3>
                <TransactionList type="expense" />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="income">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="text-lg font-semibold mb-4 font-headline">Add Income</h3>
                <TransactionForm type="income" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4 font-headline">Recent Income</h3>
                <TransactionList type="income" />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
