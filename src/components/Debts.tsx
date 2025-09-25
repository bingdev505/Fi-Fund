'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import DebtForm from './DebtForm';
import DebtList from './DebtList';

export default function Debts() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Debts</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="creditors" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="creditors">You Owe (Creditors)</TabsTrigger>
            <TabsTrigger value="debtors">Owed to You (Debtors)</TabsTrigger>
          </TabsList>
          <TabsContent value="creditors">
            <div className="grid gap-6 md:grid-cols-2 mt-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold font-headline">Add Creditor</h3>
                <DebtForm type="creditor" />
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold font-headline">Outstanding Debts</h3>
                <DebtList type="creditor" />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="debtors">
            <div className="grid gap-6 md:grid-cols-2 mt-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold font-headline">Add Debtor</h3>
                <DebtForm type="debtor" />
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold font-headline">Debts Owed to You</h3>
                <DebtList type="debtor" />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
