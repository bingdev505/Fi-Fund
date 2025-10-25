'use client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useFinancials } from '@/hooks/useFinancials';
import { Loader2, PlusCircle, ListTodo, Pencil, Trash2, CalendarIcon, Check, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import type { Task } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { cn } from '@/lib/utils';
import { format, setHours, setMinutes } from 'date-fns';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

const taskSchema = z.object({
  name: z.string().min(2, 'Task name must be at least 2 characters'),
  description: z.string().optional(),
  status: z.enum(['todo', 'in-progress', 'done']),
  dueDate: z.date().optional(),
  dueTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)").optional().or(z.literal('')),
  hobbyId: z.string().optional(),
});

function TaskForm({ task, onFinished }: { task?: Task | null, onFinished: () => void }) {
  const { addTask, updateTask, hobbies } = useFinancials();
  const { toast } = useToast();
  
  const defaultDueDate = task?.dueDate ? new Date(task.dueDate) : undefined;
  const defaultDueTime = task?.dueDate ? format(new Date(task.dueDate), 'HH:mm') : '';

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      name: task?.name || '',
      description: task?.description || '',
      status: task?.status || 'todo',
      dueDate: defaultDueDate,
      dueTime: defaultDueTime,
      hobbyId: task?.hobbyId || '',
    },
  });

  function onSubmit(values: z.infer<typeof taskSchema>) {
    let finalDueDate: Date | undefined = values.dueDate;
    if (finalDueDate && values.dueTime) {
      const [hours, minutes] = values.dueTime.split(':').map(Number);
      finalDueDate = setHours(setMinutes(finalDueDate, minutes), hours);
    }

    const taskData = {
      ...values,
      dueDate: finalDueDate?.toISOString(),
      hobbyId: values.hobbyId === '' ? undefined : values.hobbyId,
    };
    delete (taskData as any).dueTime; // remove temporary field

    if (task) {
      updateTask(task.id, taskData);
      toast({ title: 'Task Updated' });
    } else {
      addTask(taskData);
      toast({ title: 'Task Added' });
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
              <FormLabel>Task Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Plan hiking trip" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g. Research trails, book campsite..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="todo">To Do</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>Due Date (Optional)</FormLabel>
                    <Popover>
                    <PopoverTrigger asChild>
                        <FormControl>
                        <Button
                            variant={'outline'}
                            className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                        >
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
                )}
            />
        </div>
         <FormField
            control={form.control}
            name="dueTime"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Due Time (Optional)</FormLabel>
                    <FormControl>
                        <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
        <FormField
          control={form.control}
          name="hobbyId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Link to Hobby (Optional)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Select a hobby" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {hobbies.map(hobby => (
                    <SelectItem key={hobby.id} value={hobby.id}>{hobby.name}</SelectItem>
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

const getStatusBadgeVariant = (status: Task['status']) => {
    switch (status) {
        case 'todo': return 'secondary';
        case 'in-progress': return 'default';
        case 'done': return 'outline';
        default: return 'secondary';
    }
}


export default function Tasks() {
  const { isLoading, tasks, hobbies, deleteTask, updateTask } = useFinancials();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  
  const getHobbyName = (hobbyId?: string) => hobbies.find(h => h.id === hobbyId)?.name;

  const handleAddClick = () => {
    setEditingTask(null);
    setFormOpen(true);
  };

  const handleEditClick = (task: Task) => {
    setEditingTask(task);
    setFormOpen(true);
  };

  const handleDelete = () => {
    if (!deletingTask) return;
    deleteTask(deletingTask.id);
    toast({ title: "Task Deleted" });
    setDeletingTask(null);
  };

  const handleStatusChange = (task: Task, status: Task['status']) => {
      updateTask(task.id, { status });
      toast({ title: "Task Updated", description: `Task "${task.name}" moved to ${status}.`});
  }

  return (
    <Dialog open={formOpen} onOpenChange={(open) => {
      setFormOpen(open);
      if (!open) setEditingTask(null);
    }}>
      <AlertDialog>
        <TooltipProvider>
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>My Tasks</CardTitle>
                <CardDescription>Manage your to-do list.</CardDescription>
              </div>
              <Button onClick={handleAddClick}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Task
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-24">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : tasks.length > 0 ? (
              <div className="border rounded-md">
                <ul className="divide-y divide-border">
                  {tasks.map(task => (
                    <li key={task.id} className="flex items-start justify-between p-4 group hover:bg-muted/50">
                      <div className="flex items-start gap-4">
                        <ListTodo className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                        <div>
                          <p className="font-medium">{task.name}</p>
                          <p className="text-sm text-muted-foreground">{task.description}</p>
                          <div className="flex items-center flex-wrap gap-2 mt-2 text-xs">
                            <Badge variant={getStatusBadgeVariant(task.status)}>{task.status.replace('-', ' ')}</Badge>
                            {task.dueDate && 
                              <div className='flex items-center gap-1'>
                                <CalendarIcon className='h-3 w-3'/>
                                <span>{format(new Date(task.dueDate), 'PPP p')}</span>
                              </div>
                            }
                            {task.hobbyId && <Badge variant="secondary">{getHobbyName(task.hobbyId)}</Badge>}
                          </div>
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center flex-shrink-0 ml-4">
                          {task.status !== 'in-progress' && (
                              <Tooltip>
                                  <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" onClick={() => handleStatusChange(task, 'in-progress')}>
                                          <Clock className="h-4 w-4" />
                                      </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Mark as In Progress</p></TooltipContent>
                              </Tooltip>
                          )}
                          {task.status !== 'done' && (
                              <Tooltip>
                                  <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" onClick={() => handleStatusChange(task, 'done')}>
                                          <Check className="h-4 w-4 text-green-600" />
                                      </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Mark as Done</p></TooltipContent>
                              </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => handleEditClick(task)}>
                                    <Pencil className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Edit Task</p></TooltipContent>
                          </Tooltip>
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => setDeletingTask(task)}>
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </AlertDialogTrigger>
                              </TooltipTrigger>
                              <TooltipContent><p>Delete Task</p></TooltipContent>
                          </Tooltip>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="text-center py-10 border-dashed border-2 rounded-md">
                <p className="text-muted-foreground">You haven't added any tasks yet.</p>
              </div>
            )}
          </CardContent>
        </Card>
        </TooltipProvider>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this task.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingTask(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingTask ? 'Edit' : 'Add'} Task</DialogTitle>
        </DialogHeader>
        <TaskForm task={editingTask} onFinished={() => {
          setFormOpen(false);
          setEditingTask(null);
        }}/>
      </DialogContent>
    </Dialog>
  );
}

    