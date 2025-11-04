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
import { PlusCircle, Save } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import type { Project } from '@/lib/types';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { useAuth } from '@/context/AuthContext';

const projectSchema = z.object({
  name: z.string().min(2, 'Business name must be at least 2 characters'),
  parent_project_id: z.string().optional(),
  google_sheet_id: z.string().optional(),
});

type ProjectFormProps = {
    project?: Project | null;
    onFinished: () => void;
}

const SERVICE_ACCOUNT_EMAIL = "finance-flow-service-account@studio-9503278955-c489b.iam.gserviceaccount.com";

export default function ProjectForm({ project, onFinished }: ProjectFormProps) {
  const { addProject, updateProject, projects } = useFinancials();
  const { toast } = useToast();
  const [showSheetShareDialog, setShowSheetShareDialog] = useState(false);
  const [submittedSheetId, setSubmittedSheetId] = useState<string | null>(null);
  const { user } = useAuth();

  const form = useForm<z.infer<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project?.name || '',
      parent_project_id: project?.parent_project_id || 'none',
      google_sheet_id: project?.google_sheet_id || '',
    },
  });

  async function onSubmit(values: z.infer<typeof projectSchema>) {
    const isNewProject = !project;
    const hasNewSheetId = values.google_sheet_id && values.google_sheet_id !== project?.google_sheet_id;

    const projectData = {
        ...values,
        parent_project_id: values.parent_project_id === 'none' ? undefined : values.parent_project_id
    };

    if (project) {
        await updateProject(project.id, projectData);
        toast({ title: "Business Updated" });
    } else {
        await addProject(projectData);
        toast({
          title: 'Business Added',
          description: `Business "${values.name}" has been created.`,
        });
    }

    if ((isNewProject && values.google_sheet_id) || hasNewSheetId) {
        setSubmittedSheetId(values.google_sheet_id!);
        setShowSheetShareDialog(true);
    } else {
        onFinished();
    }
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
                <Input placeholder="e.g. My New Venture" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    {projects.filter(p => p.id !== project?.id).map((p) => (
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
            <FormField
            control={form.control}
            name="google_sheet_id"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Google Sheet ID (Optional)</FormLabel>
                <FormControl>
                    <Input placeholder="Enter Google Sheet ID" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <Button type="submit" className="w-full">
          {project ? <Save className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
          {project ? 'Save Changes' : 'Create Business'}
        </Button>
      </form>
    </Form>
    <Dialog open={showSheetShareDialog} onOpenChange={(isOpen) => {
        setShowSheetShareDialog(isOpen);
        if (!isOpen) {
            onFinished(); // Call the original onFinished when this dialog closes
        }
    }}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Connect Your Google Sheet</DialogTitle>
                <DialogDescription>
                    To finish connecting your sheet, please share it with our service account.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <p>
                    1. Open your Google Sheet: <a href={`https://docs.google.com/spreadsheets/d/${submittedSheetId}`} target="_blank" rel="noopener noreferrer" className="text-primary underline">Link to Sheet</a>
                </p>
                <p>
                    2. Click the &quot;Share&quot; button in the top-right corner.
                </p>
                <p>
                    3. In the &quot;Add people and groups&quot; field, paste the following email address:
                </p>
                <div className='bg-muted p-3 rounded-md'>
                    <p className='text-sm font-mono break-all'>{SERVICE_ACCOUNT_EMAIL}</p>
                </div>
                <p>
                    4. Make sure to give it **Editor** access, and click &quot;Send&quot;.
                </p>
            </div>
            <Button onClick={() => {
                setShowSheetShareDialog(false);
                onFinished();
            }}>Done</Button>
        </DialogContent>
    </Dialog>
    </>
  );
}
