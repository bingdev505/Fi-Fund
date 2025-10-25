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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFinancials } from '@/hooks/useFinancials';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Save, CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { HobbySession } from '@/lib/types';

const sessionSchema = z.object({
  hobbyId: z.string({ required_error: 'Please select a hobby.'}),
  date: z.date(),
  duration: z.coerce.number().min(1, "Duration must be at least 1 minute."),
  notes: z.string().optional(),
});

type HobbySessionFormProps = {
  session?: HobbySession | null;
  onFinished: () => void;
};

export default function HobbySessionForm({ session, onFinished }: HobbySessionFormProps) {
  const { addHobbySession, updateHobbySession, hobbies } = useFinancials();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof sessionSchema>>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      hobbyId: session?.hobbyId || '',
      date: session ? new Date(session.date) : new Date(),
      duration: session?.duration || 60,
      notes: session?.notes || '',
    },
  });

  function onSubmit(values: z.infer<typeof sessionSchema>) {
    const sessionData = { ...values, date: values.date.toISOString() };
    if (session) {
      updateHobbySession(session.id, {
          date: sessionData.date,
          duration: sessionData.duration,
          notes: sessionData.notes,
      });
      toast({ title: "Session Updated" });
    } else {
      addHobbySession(values.hobbyId, {
          date: sessionData.date,
          duration: sessionData.duration,
          notes: sessionData.notes,
      });
      toast({ title: "Hobby Session Logged" });
    }
    onFinished();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="hobbyId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hobby</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={!!session}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Select a hobby to log time for" /></SelectTrigger>
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
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
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
        <Button type="submit" className="w-full">
          {session ? <Save className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
          {session ? "Save Changes" : "Log Session"}
        </Button>
      </form>
    </Form>
  );
}
