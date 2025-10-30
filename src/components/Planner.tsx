'use client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useFinancials } from '@/hooks/useFinancials';
import { Loader2, PlusCircle, Heart, ListTodo, Pencil, Trash2, CalendarIcon as CalendarTaskIcon, Check, Clock, Edit, Repeat } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import type { Task, Hobby, HobbySession } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar as CalendarComponent } from './ui/calendar';
import { cn } from '@/lib/utils';
import { format, setHours, setMinutes } from 'date-fns';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import HobbySessionForm from './HobbySessionForm';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';


// Unified Plan Form
const planSchema = z.object({
  planType: z.enum(['hobby', 'task']),
  // Hobby fields
  hobbyName: z.string().optional(),
  hobbyDescription: z.string().optional(),
  hobbyTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)").optional().or(z.literal('')),
  hobbyRepeat: z.enum(['none', 'daily', 'weekly', 'monthly']).optional(),
  // Task fields
  taskName: z.string().optional(),
  taskDescription: z.string().optional(),
  taskStatus: z.enum(['todo', 'in-progress', 'done']).optional(),
  taskDueDate: z.date().optional(),
  taskDueTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)").optional().or(z.literal('')),
  taskHobbyId: z.string().optional(),
  taskRepeat: z.enum(['none', 'daily', 'weekly', 'monthly']).optional(),
}).superRefine((data, ctx) => {
    if (data.planType === 'hobby') {
        if (!data.hobbyName || data.hobbyName.length < 2) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Hobby name must be at least 2 characters", path: ['hobbyName'] });
        }
    } else if (data.planType === 'task') {
        if (!data.taskName || data.taskName.length < 2) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Task name must be at least 2 characters", path: ['taskName'] });
        }
    }
});


function PlanForm({ plan, onFinished }: { plan?: Hobby | Task | null, onFinished: () => void }) {
  const { addHobby, updateHobby, addTask, updateTask, hobbies } = useFinancials();
  const { toast } = useToast();

  const isEditingHobby = plan && 'time' in plan;
  const isEditingTask = plan && 'status' in plan;
  const defaultPlanType = isEditingHobby ? 'hobby' : 'task';
  
  const form = useForm<z.infer<typeof planSchema>>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      planType: defaultPlanType,
      hobbyName: isEditingHobby ? (plan as Hobby).name : '',
      hobbyDescription: isEditingHobby ? (plan as Hobby).description : '',
      hobbyTime: isEditingHobby ? (plan as Hobby).time || '' : '',
      hobbyRepeat: isEditingHobby ? (plan as Hobby).repeat || 'none' : 'none',
      taskName: isEditingTask ? (plan as Task).name : '',
      taskDescription: isEditingTask ? (plan as Task).description : '',
      taskStatus: isEditingTask ? (plan as Task).status || 'todo' : 'todo',
      taskDueDate: isEditingTask && (plan as Task).dueDate ? new Date((plan as Task).dueDate!) : undefined,
      taskDueTime: isEditingTask && (plan as Task).dueDate ? format(new Date((plan as Task).dueDate!), 'HH:mm') : '',
      taskHobbyId: isEditingTask ? (plan as Task).hobbyId || '' : '',
      taskRepeat: isEditingTask ? (plan as Task).repeat || 'none' : 'none',
    },
  });

  const planType = form.watch('planType');

  function onSubmit(values: z.infer<typeof planSchema>) {
    if (values.planType === 'hobby') {
      const hobbyData = { name: values.hobbyName!, description: values.hobbyDescription, time: values.hobbyTime, repeat: values.hobbyRepeat };
      if (isEditingHobby) {
        updateHobby(plan!.id, hobbyData);
        toast({ title: 'Hobby Updated' });
      } else {
        addHobby(hobbyData);
        toast({ title: 'Hobby Added' });
      }
    } else { // planType === 'task'
      let finalDueDate: Date | undefined = values.taskDueDate;
      if (finalDueDate && values.taskDueTime) {
        const [hours, minutes] = values.taskDueTime.split(':').map(Number);
        finalDueDate = setHours(setMinutes(finalDueDate, minutes), hours);
      }
      const taskData = { name: values.taskName!, description: values.taskDescription, status: values.taskStatus!, dueDate: finalDueDate?.toISOString(), hobbyId: values.taskHobbyId, repeat: values.taskRepeat };
      if (isEditingTask) {
        updateTask(plan!.id, taskData);
        toast({ title: 'Task Updated' });
      } else {
        addTask(taskData);
        toast({ title: 'Task Added' });
      }
    }
    onFinished();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
            control={form.control}
            name="planType"
            render={({ field }) => (
                <FormItem className="space-y-3">
                <FormLabel>What do you want to plan?</FormLabel>
                <FormControl>
                    <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex space-x-4"
                    disabled={!!plan}
                    >
                    <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="hobby" /></FormControl>
                        <FormLabel className="font-normal">Hobby</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="task" /></FormControl>
                        <FormLabel className="font-normal">Task</FormLabel>
                    </FormItem>
                    </RadioGroup>
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
        
        {planType === 'hobby' && (
          <>
            <FormField name="hobbyName" control={form.control} render={({ field }) => (<FormItem><FormLabel>Hobby Name</FormLabel><FormControl><Input placeholder="e.g. Hiking" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField name="hobbyDescription" control={form.control} render={({ field }) => (<FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea placeholder="e.g. Exploring new trails" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="hobbyTime" render={({ field }) => ( <FormItem> <FormLabel>Time (Optional)</FormLabel> <FormControl><Input type="time" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                <FormField control={form.control} name="hobbyRepeat" render={({ field }) => ( <FormItem> <FormLabel>Repeat (Optional)</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl> <SelectContent> <SelectItem value="none">None</SelectItem> <SelectItem value="daily">Daily</SelectItem> <SelectItem value="weekly">Weekly</SelectItem> <SelectItem value="monthly">Monthly</SelectItem> </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
            </div>
          </>
        )}

        {planType === 'task' && (
            <>
                <FormField name="taskName" control={form.control} render={({ field }) => (<FormItem><FormLabel>Task Name</FormLabel><FormControl><Input placeholder="e.g. Plan hiking trip" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField name="taskDescription" control={form.control} render={({ field }) => (<FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea placeholder="e.g. Research trails..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="taskStatus" render={({ field }) => ( <FormItem> <FormLabel>Status</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl> <SelectContent> <SelectItem value="todo">To Do</SelectItem> <SelectItem value="in-progress">In Progress</SelectItem> <SelectItem value="done">Done</SelectItem> </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
                    <FormField
                      control={form.control}
                      name="taskDueDate"
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
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="taskDueTime" render={({ field }) => ( <FormItem> <FormLabel>Due Time (Optional)</FormLabel> <FormControl><Input type="time" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                  <FormField control={form.control} name="taskRepeat" render={({ field }) => ( <FormItem> <FormLabel>Repeat (Optional)</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl> <SelectContent> <SelectItem value="none">None</SelectItem> <SelectItem value="daily">Daily</SelectItem> <SelectItem value="weekly">Weekly</SelectItem> <SelectItem value="monthly">Monthly</SelectItem> </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
                </div>
                <FormField control={form.control} name="taskHobbyId" render={({ field }) => ( <FormItem> <FormLabel>Link to Hobby (Optional)</FormLabel> <Select onValueChange={field.onChange} value={field.value || ''}> <FormControl> <SelectTrigger><SelectValue placeholder="Select a hobby" /></SelectTrigger> </FormControl> <SelectContent> <SelectItem value="">None</SelectItem> {hobbies.map(hobby => (<SelectItem key={hobby.id} value={hobby.id}>{hobby.name}</SelectItem>))} </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
            </>
        )}

        <Button type="submit" className="w-full">{plan ? 'Save Changes' : 'Add Plan'}</Button>
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


export default function Planner() {
  const { isLoading, tasks, hobbies, deleteTask, updateTask, deleteHobby, hobbySessions, deleteHobbySession } = useFinancials();
  const { toast } = useToast();
  
  const [planFormOpen, setPlanFormOpen] = useState(false);
  const [sessionFormOpen, setSessionFormOpen] = useState(false);

  const [editingPlan, setEditingPlan] = useState<Hobby | Task | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ type: 'hobby' | 'task' | 'session', id: string} | null>(null);
  const [editingSession, setEditingSession] = useState<HobbySession | null>(null);

  const getHobbyName = (hobbyId?: string) => hobbies.find(h => h.id === hobbyId)?.name;

  const handleEditPlanClick = (plan: Hobby | Task) => { setEditingPlan(plan); setPlanFormOpen(true); };
  const handleEditSessionClick = (session: HobbySession) => { setEditingSession(session); setSessionFormOpen(true); };

  const handleDelete = () => {
      if (!deletingItem) return;
      if (deletingItem.type === 'hobby') {
          deleteHobby(deletingItem.id);
          toast({ title: "Hobby Deleted" });
      } else if (deletingItem.type === 'task') {
          deleteTask(deletingItem.id);
          toast({ title: "Task Deleted" });
      } else if (deletingItem.type === 'session') {
          deleteHobbySession(deletingItem.id);
          toast({ title: "Session Deleted" });
      }
      setDeletingItem(null);
  };

  const handleStatusChange = (task: Task, status: Task['status']) => { updateTask(task.id, { status }); toast({ title: "Task Updated" }); };

  return (
    <Dialog open={planFormOpen} onOpenChange={(open) => { setPlanFormOpen(open); if (!open) setEditingPlan(null); }}>
      <Dialog open={sessionFormOpen} onOpenChange={(open) => { setSessionFormOpen(open); if (!open) setEditingSession(null); }}>
        <AlertDialog>
          <TooltipProvider>
            <div className="p-4 md:p-6 space-y-6">
                <div className="flex justify-end">
                   <Button onClick={() => { setEditingPlan(null); setPlanFormOpen(true); }}><PlusCircle className="mr-2 h-4 w-4" /> Add Plan</Button>
                </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Hobbies Section */}
                <Card>
                  <CardHeader>
                    <div><CardTitle>My Hobbies</CardTitle><CardDescription>Activities you enjoy and track.</CardDescription></div>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? ( <div className="flex justify-center items-center h-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> ) 
                    : hobbies.length > 0 ? (
                      <div className="border rounded-md"><ul className="divide-y divide-border">
                        {hobbies.map(hobby => (
                          <li key={hobby.id} className="flex items-start justify-between p-4 group hover:bg-muted/50">
                            <div className="flex items-start gap-4">
                              <Heart className="h-6 w-6 text-red-500 mt-1 flex-shrink-0" />
                              <div>
                                  <p className="font-medium">{hobby.name}</p>
                                  <p className="text-sm text-muted-foreground">{hobby.description}</p>
                                  <div className="flex items-center flex-wrap gap-2 mt-2 text-xs">
                                    {hobby.time && <div className='flex items-center gap-1'><Clock className='h-3 w-3'/><span>{hobby.time}</span></div>}
                                    {hobby.repeat && hobby.repeat !== 'none' && <div className='flex items-center gap-1'><Repeat className='h-3 w-3'/><span>{hobby.repeat}</span></div>}
                                  </div>
                              </div>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center flex-shrink-0 ml-4">
                                <Button variant="ghost" size="icon" onClick={() => handleEditPlanClick(hobby)}><Pencil className="h-4 w-4" /></Button>
                                <AlertDialogTrigger asChild><Button variant="ghost" size="icon" onClick={() => setDeletingItem({ type: 'hobby', id: hobby.id })}><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                            </div>
                          </li>
                        ))}
                      </ul></div>
                    ) : ( <div className="text-center py-10 border-dashed border-2 rounded-md"><p className="text-muted-foreground">You haven't added any hobbies yet.</p></div> )}
                  </CardContent>
                </Card>
                {/* Tasks Section */}
                <Card>
                  <CardHeader>
                      <div><CardTitle>My Tasks</CardTitle><CardDescription>Your to-do list, connected to your hobbies.</CardDescription></div>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? ( <div className="flex justify-center items-center h-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> ) 
                    : tasks.length > 0 ? (
                      <div className="border rounded-md"><ul className="divide-y divide-border">
                        {tasks.map(task => (
                          <li key={task.id} className="flex items-start justify-between p-4 group hover:bg-muted/50">
                            <div className="flex items-start gap-4">
                              <ListTodo className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                              <div>
                                <p className="font-medium">{task.name}</p>
                                <p className="text-sm text-muted-foreground">{task.description}</p>
                                <div className="flex items-center flex-wrap gap-2 mt-2 text-xs">
                                  <Badge variant={getStatusBadgeVariant(task.status)}>{task.status.replace('-', ' ')}</Badge>
                                  {task.dueDate && <div className='flex items-center gap-1'><CalendarTaskIcon className='h-3 w-3'/><span>{format(new Date(task.dueDate), 'PPP p')}</span></div>}
                                  {task.hobbyId && <Badge variant="secondary">{getHobbyName(task.hobbyId)}</Badge>}
                                  {task.repeat && task.repeat !== 'none' && <div className='flex items-center gap-1'><Repeat className='h-3 w-3'/><span>{task.repeat}</span></div>}
                                </div>
                              </div>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center flex-shrink-0 ml-4">
                                {task.status !== 'in-progress' && (<Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleStatusChange(task, 'in-progress')}><Clock className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Mark as In Progress</p></TooltipContent></Tooltip>)}
                                {task.status !== 'done' && (<Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleStatusChange(task, 'done')}><Check className="h-4 w-4 text-green-600" /></Button></TooltipTrigger><TooltipContent><p>Mark as Done</p></TooltipContent></Tooltip>)}
                                <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleEditPlanClick(task)}><Pencil className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Edit Task</p></TooltipContent></Tooltip>
                                <Tooltip><TooltipTrigger asChild><AlertDialogTrigger asChild><Button variant="ghost" size="icon" onClick={() => setDeletingItem({ type: 'task', id: task.id })}><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger></TooltipTrigger><TooltipContent><p>Delete Task</p></TooltipContent></Tooltip>
                            </div>
                          </li>
                        ))}
                      </ul></div>
                    ) : ( <div className="text-center py-10 border-dashed border-2 rounded-md"><p className="text-muted-foreground">You haven't added any tasks yet.</p></div> )}
                  </CardContent>
                </Card>
              </div>
              {/* Hobby Sessions Section */}
              <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div><CardTitle>Hobby Sessions</CardTitle><CardDescription>Log and view time spent on hobbies.</CardDescription></div>
                      <Button onClick={() => { setEditingSession(null); setSessionFormOpen(true); }}><PlusCircle className="mr-2 h-4 w-4" /> Log Session</Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                      {isLoading ? ( <div className="flex justify-center items-center h-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> )
                      : hobbySessions.length > 0 ? (
                          <div className="border rounded-md"><ul className="divide-y divide-border">
                              {hobbySessions.map(session => (
                                  <li key={session.id} className="flex items-start justify-between p-4 group hover:bg-muted/50">
                                      <div className="flex items-start gap-4">
                                          <Heart className="h-6 w-6 text-red-500 mt-1 flex-shrink-0" />
                                          <div>
                                              <p className="font-medium">{getHobbyName(session.hobbyId)}</p>
                                              <p className="text-sm text-muted-foreground">{session.notes}</p>
                                              <div className="flex items-center flex-wrap gap-2 mt-2 text-xs">
                                                  <div className='flex items-center gap-1'><CalendarTaskIcon className='h-3 w-3'/><span>{format(new Date(session.date), 'PPP')}</span></div>
                                                  <div className='flex items-center gap-1'><Clock className='h-3 w-3'/><span>{session.duration} minutes</span></div>
                                              </div>
                                          </div>
                                      </div>
                                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center flex-shrink-0 ml-4">
                                          <Button variant="ghost" size="icon" onClick={() => handleEditSessionClick(session)}><Pencil className="h-4 w-4" /></Button>
                                          <AlertDialogTrigger asChild><Button variant="ghost" size="icon" onClick={() => setDeletingItem({ type: 'session', id: session.id })}><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                                      </div>
                                  </li>
                              ))}
                          </ul></div>
                      ) : ( <div className="text-center py-10 border-dashed border-2 rounded-md"><p className="text-muted-foreground">No hobby sessions logged yet.</p></div> )}
                  </CardContent>
              </Card>
            </div>
          </TooltipProvider>
          {/* Delete Dialog */}
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>This action cannot be undone and will permanently delete this item.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDeletingItem(null)}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {/* Form Dialogs */}
        <DialogContent>
            <DialogHeader><DialogTitle>{editingPlan ? 'Edit' : 'Add'} Plan</DialogTitle></DialogHeader>
            <PlanForm plan={editingPlan} onFinished={() => { setPlanFormOpen(false); setEditingPlan(null); }}/>
        </DialogContent>
        <DialogContent>
            <DialogHeader><DialogTitle>{editingSession ? 'Edit' : 'Log'} Hobby Session</DialogTitle></DialogHeader>
            <HobbySessionForm session={editingSession} onFinished={() => { setSessionFormOpen(false); setEditingSession(null); }}/>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

    