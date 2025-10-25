'use client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useFinancials } from '@/hooks/useFinancials';
import { Loader2, PlusCircle, Heart, Pencil, Trash2, Clock, Calendar, Notebook } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import type { Hobby, HobbySession } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { format } from 'date-fns';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar as CalendarComponent } from './ui/calendar';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';

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


export default function Hobbies() {
  const { isLoading, hobbies, hobbySessions, deleteHobby, deleteHobbySession } = useFinancials();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState<{ hobby: Hobby, session?: HobbySession | null } | null>(null);
  const [editingHobby, setEditingHobby] = useState<Hobby | null>(null);
  const [deletingHobby, setDeletingHobby] = useState<Hobby | null>(null);
  const [deletingSession, setDeletingSession] = useState<HobbySession | null>(null);

  const handleAddClick = () => {
    setEditingHobby(null);
    setFormOpen(true);
  };

  const handleEditClick = (hobby: Hobby) => {
    setEditingHobby(hobby);
    setFormOpen(true);
  };

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
  }

  const getHobbySessions = (hobbyId: string) => {
      return hobbySessions.filter(s => s.hobbyId === hobbyId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  return (
    <Dialog open={formOpen} onOpenChange={(open) => {
      setFormOpen(open);
      if (!open) setEditingHobby(null);
    }}>
      <Dialog open={!!sessionForm} onOpenChange={(open) => !open && setSessionForm(null)}>
        <AlertDialog>
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>My Hobbies</CardTitle>
                  <CardDescription>Keep track of your hobbies and log time spent on them.</CardDescription>
                </div>
                <Button onClick={handleAddClick}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Hobby
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-24">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
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
                                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(hobby)}><Pencil className="h-4 w-4" /></Button>
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
                <div className="text-center py-10 border-dashed border-2 rounded-md">
                  <p className="text-muted-foreground">You haven't added any hobbies yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                {deletingHobby && "This will permanently delete this hobby and all its logged sessions."}
                {deletingSession && "This will permanently delete this session log."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setDeletingHobby(null); setDeletingSession(null); }}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={deletingHobby ? handleDeleteHobby : handleDeleteSession}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingHobby ? 'Edit' : 'Add'} Hobby</DialogTitle>
          </DialogHeader>
          <HobbyForm hobby={editingHobby} onFinished={() => setFormOpen(false)} />
        </DialogContent>

        {sessionForm?.hobby && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{sessionForm.session ? 'Edit' : 'Log'} Session for {sessionForm.hobby.name}</DialogTitle>
            </DialogHeader>
            <SessionForm hobby={sessionForm.hobby} session={sessionForm.session} onFinished={() => setSessionForm(null)} />
          </DialogContent>
        )}
      </Dialog>
    </Dialog>
  );
}
