'use client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useFinancials } from '@/hooks/useFinancials';
import { Loader2, Tag, PlusCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const categorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters'),
  type: z.enum(['income', 'expense']),
});

export default function CategoriesView() {
  const { isLoading, categories, addCategory } = useFinancials();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', type: 'expense' },
  });

  function onSubmit(values: z.infer<typeof categorySchema>) {
    addCategory(values);
    toast({
      title: 'Category Added',
      description: `Category "${values.name}" has been created.`,
    });
    form.reset();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Categories</CardTitle>
        <CardDescription>Add custom income or expense categories for the active business.</CardDescription>
      </CardHeader>
      <CardContent>
        <div>
          <h3 className="text-lg font-medium mb-2">Add New Category</h3>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-end gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="flex-grow">
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
                        <SelectTrigger className="w-[180px]">
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
              <Button type="submit">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </form>
          </Form>
        </div>
        <Separator className='my-6' />
        <div>
          <h3 className="text-lg font-medium mb-4">Your Custom Categories</h3>
          {isLoading ? (
            <div className="flex justify-center items-center h-24">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : categories.length > 0 ? (
            <div className="border rounded-md">
              <ul className="divide-y divide-border">
                {categories.map(cat => (
                  <li key={cat.id} className="flex items-center justify-between p-4 hover:bg-muted/50">
                    <div className="flex items-center gap-4">
                      <Tag className="h-6 w-6 text-muted-foreground" />
                      <div>
                        <span className="font-medium">{cat.name}</span>
                      </div>
                    </div>
                    <div className={`text-sm font-medium ${cat.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {cat.type.charAt(0).toUpperCase() + cat.type.slice(1)}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-center py-10 border-dashed border-2 rounded-md">
              <p className="text-muted-foreground text-sm">You haven't added any custom categories for this business yet.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
