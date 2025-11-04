'use client';

import { useState, useMemo } from 'react';
import { useFinancials } from '@/hooks/useFinancials';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PlusCircle, ListTodo, Loader2, Pencil, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from './ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Task } from '@/lib/types';
import { CalendarIcon } from 'lucide-react';

const taskSchema = z.object({
  name: z.string().min(3, 'Task name must be at least 3 characters'),
  description: z.string().optional(),
  status: z.enum(['todo', 'in-progress', 'done']),
  due_date: z.date().optional(),
  project_id: z.string().optional(),
});

type TaskFormProps = {
    task?: Task | null;
    onFinished: () => void;
};

function TaskForm({ task, onFinished }: TaskFormProps) {
    const { addTask, updateTask, projects, activeProject } = useFinancials();
    const { toast } = useToast();

    const form = useForm<z.infer<typeof taskSchema>>({
        resolver: zodResolver(taskSchema),
        defaultValues: task ? {
            name: task.name,
            description: task.description || '',
            status: task.status,
            due_date: task.due_date ? parseISO(task.due_date) : undefined,
            project_id: task.project_id || 'personal',
        } : {
            name: '',
            description: '',
            status: 'todo',
            project_id: activeProject?.id !== 'all' ? activeProject?.id : 'personal',
        }
    });

    async function onSubmit(values: z.infer<typeof taskSchema>) {
        const finalValues = {
            ...values,
            project_id: values.project_id === 'personal' ? undefined : values.project_id,
            due_date: values.due_date?.toISOString(),
        };

        if (task) {
            await updateTask(task.id, finalValues);
            toast({ title: "Task Updated" });
        } else {
            await addTask(finalValues);
            toast({ title: "Task Added" });
        }
        onFinished();
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Task Name</FormLabel>
                        <FormControl><Input placeholder="e.g. Finish report" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                 <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl><Textarea placeholder="Add more details..." {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="todo">To Do</SelectItem>
                                    <SelectItem value="in-progress">In Progress</SelectItem>
                                    <SelectItem value="done">Done</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="due_date" render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Due Date (Optional)</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button variant="outline" className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>
                                            {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>
                 <FormField
                    control={form.control}
                    name="project_id"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Business (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || 'personal'}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Personal / No Business" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="personal">Personal</SelectItem>
                            {projects.map((p) => (
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
                <Button type="submit" className="w-full">
                    {task ? 'Save Changes' : 'Add Task'}
                </Button>
            </form>
        </Form>
    );
}


export default function TaskTracker() {
  const { tasks, deleteTask, isLoading } = useFinancials();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  
  const handleEditClick = (task: Task) => {
    setEditingTask(task);
    setFormOpen(true);
  };
  
  const handleAddClick = () => {
    setEditingTask(null);
    setFormOpen(true);
  };

  const handleDelete = () => {
    if (!deletingTask) return;
    deleteTask(deletingTask.id);
    toast({ title: "Task Deleted" });
    setDeletingTask(null);
  };

  const sortedTasks = useMemo(() => {
    const statusOrder = { 'in-progress': 1, 'todo': 2, 'done': 3 };
    return [...tasks].sort((a, b) => {
        if (a.status !== b.status) {
            return statusOrder[a.status] - statusOrder[b.status];
        }
        const aDate = a.due_date ? new Date(a.due_date).getTime() : Infinity;
        const bDate = b.due_date ? new Date(b.due_date).getTime() : Infinity;
        return aDate - bDate;
    });
  }, [tasks]);

  const getStatusBadge = (status: Task['status']) => {
    switch (status) {
      case 'todo':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-200 text-gray-800">To Do</span>;
      case 'in-progress':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-200 text-blue-800">In Progress</span>;
      case 'done':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-200 text-green-800">Done</span>;
    }
  };


  return (
    <Dialog open={formOpen} onOpenChange={(open) => {
        setFormOpen(open);
        if (!open) setEditingTask(null);
    }}>
      <AlertDialog>
        <Card>
          <CardHeader>
             <div className="flex justify-between items-center">
              <div>
                <CardTitle>Task Tracker</CardTitle>
                <CardDescription>Manage your to-do items and tasks.</CardDescription>
              </div>
              <Button onClick={handleAddClick}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Task
              </Button>
            </div>
          </CardHeader>
          <CardContent>
             {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : tasks.length > 0 ? (
                <div className="border rounded-md">
                  <ul className="divide-y divide-border">
                    {sortedTasks.map(task => (
                      <li key={task.id} className="flex items-center justify-between p-4 group hover:bg-muted/50">
                        <div className="flex items-center gap-4">
                            <ListTodo className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="font-medium">{task.name}</p>
                                {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
                                {task.due_date && <p className="text-xs text-muted-foreground">Due: {format(parseISO(task.due_date), 'PPP')}</p>}
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                           {getStatusBadge(task.status)}
                           <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(task)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => setDeletingTask(task)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-center py-10 border-dashed border-2 rounded-md">
                  <p className="text-muted-foreground text-sm">You have no tasks yet. Add one to get started!</p>
                </div>
              )}
          </CardContent>
        </Card>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>This action cannot be undone. This will permanently delete this task.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeletingTask(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingTask ? 'Edit Task' : 'Add a New Task'}</DialogTitle>
            </DialogHeader>
            <TaskForm task={editingTask} onFinished={() => {
                setFormOpen(false);
                setEditingTask(null);
            }} />
        </DialogContent>
    </Dialog>
  );
}
