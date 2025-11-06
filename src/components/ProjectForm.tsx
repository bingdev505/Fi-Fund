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
import { PlusCircle, Save, Link } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import type { Project } from '@/lib/types';
import { useState } from 'react';
import { getGoogleAuthUrl } from '@/app/actions';


const projectSchema = z.object({
  name: z.string().min(2, 'Business name must be at least 2 characters'),
  parent_project_id: z.string().optional(),
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
      parent_project_id: project?.parent_project_id || 'none',
    },
  });
  
  const handleConnectGoogle = async () => {
    try {
        const { url } = await getGoogleAuthUrl();
        window.location.href = url;
    } catch (error) {
        console.error("Failed to get Google Auth URL", error);
        toast({
            variant: 'destructive',
            title: 'Could not connect to Google',
            description: 'There was an error generating the authentication URL. Please try again.'
        })
    }
  }

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

        <div className='space-y-2'>
            <FormLabel>Integrations</FormLabel>
            <Button variant="outline" type="button" className="w-full" onClick={handleConnectGoogle}>
                <Link className="mr-2" />
                Connect with Google
            </Button>
        </div>
        
        <Button type="submit" className="w-full">
          {project ? <Save className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
          {project ? 'Save Changes' : 'Create Business'}
        </Button>
      </form>
    </Form>
    </>
  );
}
