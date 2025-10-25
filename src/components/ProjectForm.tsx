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

const projectSchema = z.object({
  name: z.string().min(2, 'Business name must be at least 2 characters'),
  parentProjectId: z.string().optional(),
  googleSheetId: z.string().optional(),
});

type ProjectFormProps = {
    project?: Project | null;
    onFinished: () => void;
}

export default function ProjectForm({ project, onFinished }: ProjectFormProps) {
  const { addProject, updateProject, projects } = useFinancials();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project?.name || '',
      parentProjectId: project?.parentProjectId || '',
      googleSheetId: project?.googleSheetId || '',
    },
  });

  function onSubmit(values: z.infer<typeof projectSchema>) {
    if (project) {
        updateProject(project.id, values);
        toast({ title: "Business Updated" });
    } else {
        addProject(values);
        toast({
          title: 'Business Added',
          description: `Business "${values.name}" has been created.`,
        });
    }
    onFinished();
  }

  return (
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
            name="parentProjectId"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Parent Business (Optional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a parent business" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
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
            name="googleSheetId"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Google Sheet ID (Optional)</FormLabel>
                <FormControl>
                    <Input placeholder="Enter Google Sheet ID" {...field} />
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
  );
}
