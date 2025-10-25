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
import { PlusCircle } from 'lucide-react';

const projectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters'),
});

type ProjectFormProps = {
    onFinished: () => void;
}

export default function ProjectForm({ onFinished }: ProjectFormProps) {
  const { addProject } = useFinancials();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
    },
  });

  function onSubmit(values: z.infer<typeof projectSchema>) {
    addProject(values.name);
    toast({
      title: 'Project Added',
      description: `Project "${values.name}" has been created.`,
    });
    form.reset();
    onFinished();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-sm">
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
        <Button type="submit" className="w-full">
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Business
        </Button>
      </form>
    </Form>
  );
}
