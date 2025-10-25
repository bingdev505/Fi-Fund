'use client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFinancials } from '@/hooks/useFinancials';
import { CURRENCIES } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';

export default function Settings() {
  const { currency, setCurrency } = useFinancials();
  const { toast } = useToast();

  function handleCurrencyChange(value: string) {
    setCurrency(value);
    toast({
      title: 'Currency Updated',
      description: `The currency has been set to ${value}.`,
    });
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Currency Settings</CardTitle>
          <CardDescription>Select your preferred currency for the application.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full max-w-xs">
            <Select onValueChange={handleCurrencyChange} defaultValue={currency}>
              <SelectTrigger>
                <SelectValue placeholder="Select a currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(c => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
