'use client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useFinancials } from '@/hooks/useFinancials';
import { Loader2, PlusCircle, Heart, Pencil, Trash2, Clock, Calendar, Notebook, ListTodo, CalendarIcon as CalendarTaskIcon, Check } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import type { Hobby, HobbySession, Task } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { format, setHours, setMinutes } from 'date-fns';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar as CalendarComponent } from './ui/calendar';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

// Hobby Form
const hobbySchema = z.object({
  name: z.string().min(2, 'Hobby name must be at least 2 characters'),
  description: z.string().optional(),
});

function HobbyForm({ hobby, onFinished }: { hobby?: Hobby | null, onFinished: () => void }) {
  const { addHobby, updateHobby } = useFinancials();
  const { toast } = useToast();
  const form = useForm<z.infer<typeof hobbySchema>>({
    resolver: zodResolver(hobbySchema),
    defaultValues: {
      name: hobby?.name || '',
      description: hobby?.description || '',
    },
  });

  function onSubmit(values: z.infer<typeof hobbySchema>) {
    if (hobby) {
      updateHobby(hobby.id, values);
      toast({ title: 'Hobby Updated' });
    } else {
      addHobby(values);
      toast({ title: 'Hobby Added' });
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
              <FormLabel>Hobby Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Hiking" {...field} />
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
                <Textarea placeholder="e.g. Exploring trails and mountains." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          {hobby ? 'Save Changes' : 'Add Hobby'}
        </Button>
      </form>
    </Form>
  );
}

// Session Form
const sessionSchema = z.object({
    date: z.date(),
    duration: z.coerce.number().min(1, "Duration must be at least 1 minute."),
    notes: z.string().optional(),
});

function SessionForm({ hobby, session, onFinished }: { hobby: Hobby, session?: HobbySession | null, onFinished: () => void }) {
    const { addHobbySession, updateHobbySession } = useFinancials();
    const { toast } = useToast();
    const form = useForm<z.infer<typeof sessionSchema>>({
        resolver: zodResolver(sessionSchema),
        defaultValues: {
            date: session ? new Date(session.date) : new Date(),
            duration: session?.duration || 60,
            notes: session?.notes || '',
        },
    });

    function onSubmit(values: z.infer<typeof sessionSchema>) {
        const sessionData = { ...values, date: values.date.toISOString() };
        if (session) {
            updateHobbySession(session.id, sessionData);
            toast({ title: "Session Updated" });
        } else {
            addHobbySession(hobby.id, sessionData);
            toast({ title: "Session Logged" });
        }
        onFinished();
    }
    
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Date</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <CalendarComponent mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="duration"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Duration (minutes)</FormLabel>
                                <FormControl><Input type="number" placeholder="60" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Notes (Optional)</FormLabel>
                            <FormControl><Textarea placeholder="e.g. Reached the summit!" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="w-full">{session ? "Save Changes" : "Log Session"}</Button>
            </form>
        </Form>
    );
}

// Task Form
const taskSchema = z.object({
  name: z.string().min(2, 'Task name must be at least 2 characters'),
  description: z.string().optional(),
  status: z.enum(['todo', 'in-progress', 'done']),
  dueDate: z.date().optional(),
  dueTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)").optional().or(z.literal('')),
  hobbyId: z.string().optional(),
});

export function TaskForm({ task, onFinished }: { task?: Task | null, onFinished: () => void }) {
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
      hobbyId: values.hobbyId,
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
                            <CalendarTaskIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                        </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
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
              <Select onValueChange={field.onChange} value={field.value || ''}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Select a hobby" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
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

// Status Badge
const getStatusBadgeVariant = (status: Task['status']) => {
    switch (status) {
        case 'todo': return 'secondary';
        case 'in-progress': return 'default';
        case 'done': return 'outline';
        default: return 'secondary';
    }
}

export default function Planner() {
  const { isLoading, hobbies, hobbySessions, tasks, deleteHobby, deleteHobbySession, deleteTask, updateTask } = useFinancials();
  const { toast } = useToast();
  
  // State for Hobbies
  const [hobbyFormOpen, setHobbyFormOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState<{ hobby: Hobby, session?: HobbySession | null } | null>(null);
  const [editingHobby, setEditingHobby] = useState<Hobby | null>(null);
  const [deletingHobby, setDeletingHobby] = useState<Hobby | null>(null);
  const [deletingSession, setDeletingSession] = useState<HobbySession | null>(null);
  
  // State for Tasks
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  const getHobbyName = (hobbyId?: string) => hobbies.find(h => h.id === hobbyId)?.name;
  
  // Hobby handlers
  const handleAddHobbyClick = () => { setEditingHobby(null); setHobbyFormOpen(true); };
  const handleEditHobbyClick = (hobby: Hobby) => { setEditingHobby(hobby); setHobbyFormOpen(true); };
  const handleDeleteHobby = () => {
    if (!deletingHobby) return;
    deleteHobby(deletingHobby.id);
    toast({ title: "Hobby Deleted" });
    setDeletingHobby(null);
  };
  const handleDeleteSession = () => {
      if (!deletingSession) return;
      deleteHobbySession(deletingSession.id);
      toast({ title: "Session Deleted" });
      setDeletingSession(null);
  };
  const getHobbySessions = (hobbyId: string) => {
      return hobbySessions.filter(s => s.hobbyId === hobbyId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  // Task handlers
  const handleAddTaskClick = () => { setEditingTask(null); setTaskFormOpen(true); };
  const handleEditTaskClick = (task: Task) => { setEditingTask(task); setTaskFormOpen(true); };
  const handleDeleteTask = () => {
    if (!deletingTask) return;
    deleteTask(deletingTask.id);
    toast({ title: "Task Deleted" });
    setDeletingTask(null);
  };
  const handleStatusChange = (task: Task, status: Task['status']) => {
      updateTask(task.id, { status });
      toast({ title: "Task Updated", description: `Task "${task.name}" moved to ${status}.`});
  };

  return (
    <div className="space-y-6">
      <Dialog open={hobbyFormOpen} onOpenChange={(open) => { setHobbyFormOpen(open); if (!open) setEditingHobby(null); }}>
      <Dialog open={!!sessionForm} onOpenChange={(open) => !open && setSessionForm(null)}>
      <Dialog open={taskFormOpen} onOpenChange={(open) => { setTaskFormOpen(open); if (!open) setEditingTask(null); }}>
        <AlertDialog>
          <TooltipProvider>
            {/* Hobbies Section */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>My Hobbies</CardTitle>
                    <CardDescription>Keep track of your hobbies and log time spent on them.</CardDescription>
                  </div>
                  <Button onClick={handleAddHobbyClick}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Hobby
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center h-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : hobbies.length > 0 ? (
                  <div className="space-y-6">
                    {hobbies.map(hobby => {
                      const sessions = getHobbySessions(hobby.id);
                      const totalDuration = sessions.reduce((sum, s) => sum + s.duration, 0);

                      return (
                          <Card key={hobby.id} className="group/hobby">
                              <CardHeader>
                                  <div className="flex justify-between items-start">
                                      <div>
                                          <CardTitle className="flex items-center gap-2">
                                              <Heart className="h-5 w-5 text-red-500" />
                                              {hobby.name}
                                          </CardTitle>
                                          <p className="text-sm text-muted-foreground mt-1">{hobby.description}</p>
                                      </div>
                                      <div className="flex items-center">
                                          <div className="opacity-0 group-hover/hobby:opacity-100 transition-opacity flex items-center">
                                              <Button variant="ghost" size="icon" onClick={() => handleEditHobbyClick(hobby)}><Pencil className="h-4 w-4" /></Button>
                                              <AlertDialogTrigger asChild>
                                                  <Button variant="ghost" size="icon" onClick={() => setDeletingHobby(hobby)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                              </AlertDialogTrigger>
                                          </div>
                                          <Button variant="outline" size="sm" onClick={() => setSessionForm({ hobby })}><Clock className="mr-2 h-4 w-4" />Log Session</Button>
                                      </div>
                                  </div>
                              </CardHeader>
                              <CardContent>
                                  <div className="text-sm text-muted-foreground mb-2">
                                      Total time logged: <strong>{Math.floor(totalDuration / 60)}h {totalDuration % 60}m</strong>
                                  </div>
                                  {sessions.length > 0 && (
                                      <div className="border rounded-md p-2">
                                          <h4 className="font-semibold mb-2 px-2">Recent Sessions</h4>
                                          <ul className="divide-y">
                                              {sessions.slice(0, 3).map(session => (
                                                  <li key={session.id} className="group/session flex justify-between items-center py-2 px-2 hover:bg-muted/50 rounded-md">
                                                      <div className='flex items-center gap-4'>
                                                          <Calendar className="h-4 w-4"/>
                                                          <div>
                                                              <p className='font-medium'>{format(new Date(session.date), 'PPP')}</p>
                                                              <p className='text-xs text-muted-foreground'>{session.duration} minutes {session.notes && `- ${session.notes}`}</p>
                                                          </div>
                                                      </div>
                                                      <div className="opacity-0 group-hover/session:opacity-100 transition-opacity flex items-center">
                                                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSessionForm({ hobby, session })}><Pencil className="h-3 w-3" /></Button>
                                                          <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeletingSession(session)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                                                          </AlertDialogTrigger>
                                                      </div>
                                                  </li>
                                              ))}
                                          </ul>
                                      </div>
                                  )}
                              </CardContent>
                          </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10 border-dashed border-2 rounded-md"><p className="text-muted-foreground">You haven't added any hobbies yet.</p></div>
                )}
              </CardContent>
            </Card>

            {/* Tasks Section */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>My Tasks</CardTitle>
                    <CardDescription>Manage your to-do list.</CardDescription>
                  </div>
                  <Button onClick={handleAddTaskClick}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Task
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center h-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
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
                                    <CalendarTaskIcon className='h-3 w-3'/>
                                    <span>{format(new Date(task.dueDate), 'PPP p')}</span>
                                  </div>
                                }
                                {task.hobbyId && <Badge variant="secondary">{getHobbyName(task.hobbyId)}</Badge>}
                              </div>
                            </div>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center flex-shrink-0 ml-4">
                              {task.status !== 'in-progress' && (
                                  <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleStatusChange(task, 'in-progress')}><Clock className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Mark as In Progress</p></TooltipContent></Tooltip>
                              )}
                              {task.status !== 'done' && (
                                  <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleStatusChange(task, 'done')}><Check className="h-4 w-4 text-green-600" /></Button></TooltipTrigger><TooltipContent><p>Mark as Done</p></TooltipContent></Tooltip>
                              )}
                              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleEditTaskClick(task)}><Pencil className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Edit Task</p></TooltipContent></Tooltip>
                              <Tooltip><TooltipTrigger asChild><AlertDialogTrigger asChild><Button variant="ghost" size="icon" onClick={() => setDeletingTask(task)}><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger></TooltipTrigger><TooltipContent><p>Delete Task</p></TooltipContent></Tooltip>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="text-center py-10 border-dashed border-2 rounded-md"><p className="text-muted-foreground">You haven't added any tasks yet.</p></div>
                )}
              </CardContent>
            </Card>

          </TooltipProvider>

          {/* AlertDialog for Deletions */}
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                {deletingHobby && "This will permanently delete this hobby and all its logged sessions."}
                {deletingSession && "This will permanently delete this session log."}
                {deletingTask && "This will permanently delete this task."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setDeletingHobby(null); setDeletingSession(null); setDeletingTask(null); }}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={deletingHobby ? handleDeleteHobby : deletingSession ? handleDeleteSession : handleDeleteTask}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialogs for Forms */}
        <DialogContent><DialogHeader><DialogTitle>{editingHobby ? 'Edit' : 'Add'} Hobby</DialogTitle></DialogHeader><HobbyForm hobby={editingHobby} onFinished={() => setHobbyFormOpen(false)} /></DialogContent>
        {sessionForm?.hobby && (<DialogContent><DialogHeader><DialogTitle>{sessionForm.session ? 'Edit' : 'Log'} Session for {sessionForm.hobby.name}</DialogTitle></DialogHeader><SessionForm hobby={sessionForm.hobby} session={sessionForm.session} onFinished={() => setSessionForm(null)} /></DialogContent>)}
        <DialogContent><DialogHeader><DialogTitle>{editingTask ? 'Edit' : 'Add'} Task</DialogTitle></DialogHeader><TaskForm task={editingTask} onFinished={() => { setTaskFormOpen(false); setEditingTask(null); }} /></DialogContent>
      
      </Dialog>
      </Dialog>
      </Dialog>
    </div>
  );
}
