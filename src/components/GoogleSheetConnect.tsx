'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useFinancials } from '@/hooks/useFinancials';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Loader2 } from 'lucide-react';
import type { Project } from '@/lib/types';
import { useState } from 'react';
import { syncToGoogleSheet, getGoogleOAuthUrl } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent } from './ui/card';

const connectSchema = z.object({
  google_sheet_id: z.string().optional(),
});

type GoogleSheetConnectProps = {
    project: Project;
    onFinished: () => void;
}

export default function GoogleSheetConnect({ project, onFinished }: GoogleSheetConnectProps) {
  const { updateProject, allTransactions, allLoans, allBankAccounts, allClients, allContacts, user } = useFinancials();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{success: boolean; message: string} | null>(null);


  const form = useForm<z.infer<typeof connectSchema>>({
    resolver: zodResolver(connectSchema),
    defaultValues: {
      google_sheet_id: project?.google_sheet_id || '',
    },
  });

  async function onSubmit(values: z.infer<typeof connectSchema>) {
    if (!values.google_sheet_id) {
        toast({ variant: 'destructive', title: 'Please enter a Sheet ID.' });
        return;
    }
    
    await updateProject(project.id, { google_sheet_id: values.google_sheet_id });
    handleSync(values.google_sheet_id);
  }

  const handleSync = async (sheetId: string) => {
      if (!sheetId) return;

      setIsSyncing(true);
      setSyncResult(null);

      const projectTransactions = allTransactions.filter(t => t.project_id === project.id);
      const projectLoans = allLoans.filter(l => l.project_id === project.id);
      const projectBankAccounts = allBankAccounts.filter(b => b.project_id === project.id);
      const projectClients = allClients.filter(c => c.project_id === project.id);


      try {
          const result = await syncToGoogleSheet({
              sheetId: sheetId,
              transactions: projectTransactions,
              loans: projectLoans,
              bankAccounts: projectBankAccounts,
              clients: projectClients,
              contacts: allContacts,
              userId: user?.id,
              readFromSheet: true,
          });
          setSyncResult(result);
          if (result.success) {
            toast({ title: 'Sync Successful', description: result.message });
            onFinished();
          } else {
             toast({ variant: 'destructive', title: 'Sync Failed', description: result.message });
          }
      } catch (error: any) {
          const errorMessage = error.message || 'An unknown error occurred.';
          setSyncResult({ success: false, message: errorMessage });
          toast({ variant: 'destructive', title: 'Sync Failed', description: errorMessage });
      } finally {
          setIsSyncing(false);
      }
  }

  const handleConnectGoogle = async () => {
    try {
        const { url } = await getGoogleOAuthUrl();
        window.location.href = url;
    } catch (error) {
        toast({ variant: 'destructive', title: 'Could not connect to Google', description: 'Please try again later.' });
    }
  };


  return (
    <>
    <Tabs defaultValue="service-account">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="service-account">Service Account</TabsTrigger>
            <TabsTrigger value="oauth">Google Account</TabsTrigger>
        </TabsList>
        <TabsContent value="service-account" className="pt-4">
             <div className="bg-muted p-2 rounded-md text-center text-sm font-mono break-all my-4">
                fundflow@app-fund.iam.gserviceaccount.com
            </div>
             <p className="text-sm text-muted-foreground mb-4">
                To allow this application to edit your sheet, please share it with the service account email address above as an 'Editor'.
            </p>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="google_sheet_id"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Google Sheet ID</FormLabel>
                        <FormControl>
                            <Input placeholder="Paste your Google Sheet ID here" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                <Button type="submit" className="w-full" disabled={isSyncing}>
                    {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Save & Sync
                </Button>
            </form>
            </Form>
        </TabsContent>
        <TabsContent value="oauth" className="pt-4">
            <Card>
                <CardContent className="pt-6">
                    <div className="space-y-2">
                        <h3 className="font-semibold">Connect your Google Account</h3>
                        <p className="text-sm text-muted-foreground">For a more seamless experience, connect your Google account to select sheets directly and enable auto-sync.</p>
                        <Button type="button" onClick={handleConnectGoogle} className='w-full'>Connect with Google</Button>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
    </Tabs>

    {syncResult && !syncResult.success && (
        <Alert variant={'destructive'} className="mt-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{syncResult.message}</AlertDescription>
        </Alert>
    )}
    </>
  );
}
