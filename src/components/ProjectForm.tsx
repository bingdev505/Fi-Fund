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
import { PlusCircle, Save, RefreshCw, Loader2, Sheet } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import type { Project } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { useState } from 'react';
import { syncToGoogleSheet, getGoogleOAuthUrl } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent } from './ui/card';

const projectSchema = z.object({
  name: z.string().min(2, 'Business name must be at least 2 characters'),
  parent_project_id: z.string().optional(),
  google_sheet_id: z.string().optional(),
});

type ProjectFormProps = {
    project?: Project | null;
    onFinished: () => void;
}

export default function ProjectForm({ project, onFinished }: ProjectFormProps) {
  const { addProject, updateProject, projects, allTransactions, allLoans, allBankAccounts, allClients, user } = useFinancials();
  const { toast } = useToast();
  const [showSyncPopup, setShowSyncPopup] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{success: boolean; message: string} | null>(null);
  const [newSheetId, setNewSheetId] = useState<string | null>(null);


  const form = useForm<z.infer<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project?.name || '',
      parent_project_id: project?.parent_project_id || 'none',
      google_sheet_id: project?.google_sheet_id || '',
    },
  });

  async function onSubmit(values: z.infer<typeof projectSchema>) {
    if (project?.name === 'Personal' && values.name !== 'Personal') {
        toast({
            variant: 'destructive',
            title: "Cannot rename 'Personal' project"
        });
        return;
    }

    const projectData = {
        ...values,
        parent_project_id: values.parent_project_id === 'none' ? undefined : values.parent_project_id
    };

    let updatedProject: Project;
    if (project) {
        await updateProject(project.id, projectData);
        updatedProject = { ...project, ...projectData };
        toast({ title: "Business Updated" });
    } else {
        updatedProject = await addProject(projectData);
        toast({
          title: 'Business Added',
          description: `Business "${values.name}" has been created.`,
        });
    }

    if (values.google_sheet_id) {
        setNewSheetId(values.google_sheet_id);
        setShowSyncPopup(true);
    } else {
        onFinished();
    }
  }

  const handleSync = async () => {
      if (!project || !project.google_sheet_id) return;

      setIsSyncing(true);
      setSyncResult(null);

      const projectTransactions = allTransactions.filter(t => t.project_id === project?.id);
      const projectLoans = allLoans.filter(l => l.project_id === project?.id);
      const projectBankAccounts = allBankAccounts.filter(b => b.project_id === project?.id);
      const projectClients = allClients.filter(c => c.project_id === project?.id);


      try {
          const result = await syncToGoogleSheet({
              sheetId: project.google_sheet_id,
              transactions: projectTransactions,
              loans: projectLoans,
              bankAccounts: projectBankAccounts,
              clients: projectClients,
              userId: user?.id,
          });
          setSyncResult(result);
      } catch (error: any) {
          setSyncResult({ success: false, message: error.message || 'An unknown error occurred.' });
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

  const closePopups = () => {
    setShowSyncPopup(false);
    onFinished();
  }

  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Business Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. My New Venture" {...field} disabled={project?.name === 'Personal'} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
            <FormField
            control={form.control}
            name="parent_project_id"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Parent Business (Optional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || 'none'}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a parent business" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                    {projects.filter(p => p.id !== project?.id && p.name !== 'Personal').map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                        {p.name}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />

        <Tabs defaultValue="service-account">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="service-account">Service Account</TabsTrigger>
                <TabsTrigger value="oauth">Google Account</TabsTrigger>
            </TabsList>
            <TabsContent value="service-account" className="pt-4">
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

        
        <Button type="submit" className="w-full">
          {project ? <Save className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
          {project ? 'Save Changes' : 'Create Business'}
        </Button>
      </form>
    </Form>

    <Dialog open={showSyncPopup} onOpenChange={(isOpen) => !isOpen && closePopups()}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Connect Google Sheet</DialogTitle>
                 <DialogDescription>
                    To allow this application to edit your sheet, please share it with the following service account email address as an 'Editor':
                </DialogDescription>
            </DialogHeader>
            <div className="bg-muted p-2 rounded-md text-center text-sm font-mono break-all">
                fundflow@app-fund.iam.gserviceaccount.com
            </div>

            {syncResult && (
                <Alert variant={syncResult.success ? 'default' : 'destructive'}>
                    <AlertTitle>{syncResult.success ? 'Success!' : 'Error'}</AlertTitle>
                    <AlertDescription>{syncResult.message}</AlertDescription>
                </Alert>
            )}

            <DialogFooter>
                {!syncResult?.success && (
                    <Button variant="outline" onClick={handleSync} disabled={isSyncing}>
                        {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Sync Now
                    </Button>
                )}
                <Button onClick={closePopups}>Close</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
