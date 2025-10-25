'use client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFinancials } from '@/hooks/useFinancials';
import { CURRENCIES } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';

export default function Settings() {
  const { currency, setCurrency, projects, defaultProject, setDefaultProject } = useFinancials();
  const { toast } = useToast();

  function handleCurrencyChange(value: string) {
    setCurrency(value);
    toast({
      title: 'Currency Updated',
      description: `The currency has been set to ${value}.`,
    });
  }

  function handleDefaultProjectChange(value: string) {
    const project = projects.find(p => p.id === value);
    if (project) {
        setDefaultProject(project);
        toast({
            title: 'Default Business Updated',
            description: `${project.name} is now your default business.`,
        });
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Application Settings</CardTitle>
          <CardDescription>Manage your application preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="w-full max-w-xs">
             <h3 className="text-lg font-medium mb-2">Currency</h3>
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
          <div className="w-full max-w-xs">
            <h3 className="text-lg font-medium mb-2">Default Business</h3>
            <Select onValueChange={handleDefaultProjectChange} defaultValue={defaultProject?.id}>
                <SelectTrigger>
                    <SelectValue placeholder="Select a default business" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Business</SelectItem>
                    {projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                            {p.name}
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
