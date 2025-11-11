
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFinancials } from '@/hooks/useFinancials';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PlusCircle, ListTodo, Pencil, Trash2, CheckCircle, CircleDot, PlayCircle, Bell, Repeat } from 'lucide-react';
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
import { format, parseISO, setHours, setMinutes, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Task } from '@/lib/types';
import { CalendarIcon } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const taskSchema = z.object({
  name: z.string().min(3, 'Task name must be at least 3 characters'),
  description: z.string().optional(),
  status: z.enum(['todo', 'in-progress', 'done']),
  due_date: z.date().optional(),
  due_time: z.string().optional().refine(val => !val || timeRegex.test(val), {
    message: "Invalid time format (HH:MM)",
  }),
  project_id: z.string().optional(),
  recurrence: z.enum(['none', 'daily', 'weekly', 'monthly']).optional(),
}).refine(data => !data.due_time || (data.due_time && data.due_date), {
    message: "A due date is required if you specify a time.",
    path: ["due_date"],
});

type TaskFormProps = {
    task?: Task | null;
    onFinished: () => void;
};

function TaskForm({ task, onFinished }: TaskFormProps) {
    const { addTask, updateTask, projects, activeProject } = useFinancials();
    const { toast } = useToast();

    const personalProject = useMemo(() => projects.find(p => p.name === 'Personal'), [projects]);

    const defaultTime = task?.due_date ? format(parseISO(task.due_date), 'HH:mm') : '';

    const form = useForm<z.infer<typeof taskSchema>>({
        resolver: zodResolver(taskSchema),
        defaultValues: task ? {
            name: task.name,
            description: task.description || '',
            status: task.status,
            due_date: task.due_date ? parseISO(task.due_date) : undefined,
            due_time: defaultTime,
            project_id: task.project_id || personalProject?.id,
            recurrence: task.recurrence || 'none',
        } : {
            name: '',
            description: '',
            status: 'todo',
            due_time: '',
            project_id: activeProject?.id !== 'all' ? activeProject?.id : personalProject?.id,
            recurrence: 'none',
        }
    });

    async function onSubmit(values: z.infer<typeof taskSchema>) {
        let finalDueDate: string | undefined = undefined;
        if (values.due_date) {
            let date = values.due_date;
            if (values.due_time) {
                const [hours, minutes] = values.due_time.split(':').map(Number);
                date = setHours(setMinutes(date, minutes), hours);
            }
            finalDueDate = date.toISOString();
        }

        const finalValues = {
            name: values.name,
            description: values.description,
            status: values.status,
            project_id: values.project_id,
            due_date: finalDueDate,
            recurrence: values.recurrence,
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
                        <FormControl><Textarea placeholder="Add more details..." {...field} value={field.value ?? ''} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                     <FormField
                        control={form.control}
                        name="due_time"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Due Time (Optional)</FormLabel>
                                <FormControl>
                                    <Input type="time" {...field} value={field.value ?? ''} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                        />
                </div>
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
                 <FormField
                    control={form.control}
                    name="recurrence"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Recurrence</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="project_id"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Business (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a Business" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
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

const TaskItem = ({ task, onEditClick, onDeleteClick }: { task: Task, onEditClick: (task: Task) => void, onDeleteClick: (task: Task) => void }) => {
    const { updateTask } = useFinancials();
    const { toast } = useToast();

    const handleStatusChange = (status: 'todo' | 'in-progress' | 'done') => {
        updateTask(task.id, { ...task, status });
        toast({ title: `Task moved to ${status}` });
    };

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
        <li className="flex items-center justify-between p-4 group hover:bg-muted/50">
            <div className="flex items-center gap-4">
                <ListTodo className="h-5 w-5 text-muted-foreground" />
                <div>
                    <p className="font-medium flex items-center gap-2">{task.name} {task.recurrence && task.recurrence !== 'none' && <Repeat className="h-4 w-4 text-muted-foreground" />}</p>
                    {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
                    {task.due_date && <p className="text-xs text-muted-foreground">Due: {format(parseISO(task.due_date), 'PPP p')}</p>}
                </div>
            </div>
            <div className="flex items-center gap-2">
                {getStatusBadge(task.status)}
                <div className="flex items-center">
                    {task.status === 'todo' && (
                        <Button variant="ghost" size="icon" onClick={() => handleStatusChange('in-progress')} title="Start Progress">
                            <PlayCircle className="h-4 w-4" />
                        </Button>
                    )}
                    {task.status === 'in-progress' && (
                        <Button variant="ghost" size="icon" onClick={() => handleStatusChange('done')} title="Mark as Done">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                        </Button>
                    )}
                     {task.status === 'done' && (
                        <Button variant="ghost" size="icon" onClick={() => handleStatusChange('todo')} title="Re-open Task">
                            <CircleDot className="h-4 w-4 text-gray-600" />
                        </Button>
                    )}

                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => onEditClick(task)} title="Edit Task">
                          <Pencil className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => onDeleteClick(task)} title="Delete Task">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                </div>
            </div>
        </li>
    );
};


export default function TaskTracker() {
  const { tasks, deleteTask } = useFinancials();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  
  useEffect(() => {
    const requestNotificationPermission = async () => {
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
    };
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SCHEDULE_NOTIFICATIONS',
        tasks: tasks,
      });
    }
  }, [tasks]);

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

  const { todaysTasks, otherActiveTasks, completedTasks } = useMemo(() => {
    const today: Task[] = [];
    const active: Task[] = [];
    const completed = tasks.filter(t => t.status === 'done');
    const statusOrder = { 'in-progress': 1, 'todo': 2 };

    tasks.filter(t => t.status !== 'done').forEach(task => {
      if (task.due_date && isToday(parseISO(task.due_date))) {
        today.push(task);
      } else {
        active.push(task);
      }
    });

    [today, active].forEach(arr => {
      arr.sort((a, b) => {
        const aDate = a.due_date ? new Date(a.due_date).getTime() : Infinity;
        const bDate = b.due_date ? new Date(b.due_date).getTime() : Infinity;
        if (aDate !== bDate) return aDate - bDate;
        if (a.status !== b.status) return statusOrder[a.status] - statusOrder[b.status];
        return 0;
      });
    });

    completed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { todaysTasks: today, otherActiveTasks: active, completedTasks: completed };
  }, [tasks]);


  return (
    <Dialog open={formOpen} onOpenChange={(open) => {
        setFormOpen(open);
        if (!open) setEditingTask(null);
    }}>
      <AlertDialog>
        <div className="space-y-6">
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
            {tasks.length === 0 ? (
                <div className="text-center py-10 border-dashed border-2 rounded-md">
                  <p className="text-muted-foreground text-sm">You have no tasks yet. Add one to get started!</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {todaysTasks.length > 0 && (
                        <div>
                             <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 text-amber-600"><Bell className="h-5 w-5" /> Today's Tasks ({todaysTasks.length})</h3>
                             <ul className="divide-y divide-border border rounded-md">
                                {todaysTasks.map(task => <TaskItem key={task.id} task={task} onEditClick={handleEditClick} onDeleteClick={setDeletingTask} />)}
                             </ul>
                        </div>
                    )}
                    <Accordion type="multiple" defaultValue={['active-tasks']} className="w-full">
                        <AccordionItem value="active-tasks">
                            <AccordionTrigger>Other Active Tasks ({otherActiveTasks.length})</AccordionTrigger>
                            <AccordionContent>
                               {otherActiveTasks.length > 0 ? (
                                 <ul className="divide-y divide-border border rounded-md">
                                    {otherActiveTasks.map(task => <TaskItem key={task.id} task={task} onEditClick={handleEditClick} onDeleteClick={setDeletingTask} />)}
                                 </ul>
                               ) : (
                                 <p className="text-muted-foreground text-sm p-4 text-center">No other active tasks.</p>
                               )}
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="completed-tasks">
                            <AccordionTrigger>Completed Tasks ({completedTasks.length})</AccordionTrigger>
                            <AccordionContent>
                                 {completedTasks.length > 0 ? (
                                 <ul className="divide-y divide-border border rounded-md">
                                    {completedTasks.map(task => <TaskItem key={task.id} task={task} onEditClick={handleEditClick} onDeleteClick={setDeletingTask} />)}
                                 </ul>
                               ) : (
                                <p className="text-muted-foreground text-sm p-4 text-center">No completed tasks yet.</p>
                               )}
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            )}
          </CardContent>
        </Card>
        </div>
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
