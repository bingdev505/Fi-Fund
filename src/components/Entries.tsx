'use client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import EntryForm from './EntryForm';
import EntryList from './EntryList';

export default function Entries() {
  return (
    <div className="p-4 md:p-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add a New Entry</CardTitle>
        </CardHeader>
        <CardContent>
          <EntryForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Recent Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <EntryList />
        </CardContent>
      </Card>
    </div>
  );
}
