'use client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import EntryForm from './EntryForm';
import EntryList from './EntryList';

export default function Transactions() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add a New Transaction</CardTitle>
        </CardHeader>
        <CardContent>
          <EntryForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <EntryList />
        </CardContent>
      </Card>
    </div>
  );
}
