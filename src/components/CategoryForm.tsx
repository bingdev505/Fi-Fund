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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFinancials } from '@/hooks/useFinancials';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Save } from 'lucide-react';
import type { Category } from '@/lib/types';

const categorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters'),
  type: z.enum(['income', 'expense']),
});

type CategoryFormProps = {
    category?: Category | null;
    onFinished: () => void;
}

export default function CategoryForm({ category, onFinished }: CategoryFormProps) {
  const { addCategory, updateCategory } = useFinancials();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: category ? {
      name: category.name,
      type: category.type,
    } : {
      name: '',
      type: 'expense',
    },
  });

  function onSubmit(values: z.infer<typeof categorySchema>) {
    if (category) {
        updateCategory(category.id, values);
        toast({ title: 'Category Updated' });
    } else {
        addCategory(values);
        toast({
          title: 'Category Added',
          description: `Category "${values.name}" has been created.`,
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
              <FormLabel>Category Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Marketing" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
            {category ? <Save className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            {category ? 'Save Changes' : 'Add Category'}
        </Button>
      </form>
    </Form>
  );
}
