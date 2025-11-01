'use client';

import { useState, useMemo } from 'react';
import { useFinancials } from '@/hooks/useFinancials';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PlusCircle, KeyRound, Loader2, Pencil, Trash2, Eye, EyeOff, Copy } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Credential } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

const credentialSchema = z.object({
  siteName: z.string().min(2, 'Site name must be at least 2 characters'),
  username: z.string().min(2, 'Username must be at least 2 characters'),
  password: z.string().optional(),
  totpSecret: z.string().optional(),
  projectId: z.string().optional(),
});

type CredentialFormProps = {
    credential?: Credential | null;
    onFinished: () => void;
};

function CredentialForm({ credential, onFinished }: CredentialFormProps) {
    const { addCredential, updateCredential, projects, activeProject } = useFinancials();
    const { toast } = useToast();

    const form = useForm<z.infer<typeof credentialSchema>>({
        resolver: zodResolver(credentialSchema),
        defaultValues: credential ? {
            siteName: credential.siteName,
            username: credential.username,
            password: credential.password || '',
            totpSecret: credential.totpSecret || '',
            projectId: credential.projectId || 'personal',
        } : {
            siteName: '',
            username: '',
            password: '',
            totpSecret: '',
            projectId: activeProject?.id !== 'all' ? activeProject?.id : 'personal',
        }
    });

    function onSubmit(values: z.infer<typeof credentialSchema>) {
        if (credential) {
            updateCredential(credential.id, values);
            toast({ title: "Credential Updated" });
        } else {
            addCredential(values);
            toast({ title: "Credential Added" });
        }
        onFinished();
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="siteName" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Site Name</FormLabel>
                        <FormControl><Input placeholder="e.g. Google" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                 <FormField control={form.control} name="username" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Username / Email</FormLabel>
                        <FormControl><Input placeholder="e.g. user@example.com" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl><Input type="password" placeholder="Enter password" {...field} value={field.value || ''} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="totpSecret" render={({ field }) => (
                    <FormItem>
                        <FormLabel>2FA Secret Key (TOTP)</FormLabel>
                        <FormControl><Input placeholder="Enter TOTP secret" {...field} value={field.value || ''} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                 <FormField
                    control={form.control}
                    name="projectId"
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
                    {credential ? 'Save Changes' : 'Add Credential'}
                </Button>
            </form>
        </Form>
    );
}

function PasswordDisplay({ value }: { value: string }) {
    const [visible, setVisible] = useState(false);
    const { toast } = useToast();

    const handleCopy = () => {
        navigator.clipboard.writeText(value);
        toast({ title: 'Copied to clipboard' });
    }

    return (
        <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
            <span className={cn("font-mono text-sm", !visible && "blur-sm select-none")}>
                {visible ? value : '∗∗∗∗∗∗∗∗∗∗∗∗∗∗∗∗∗∗∗∗'}
            </span>
            <div className="flex items-center gap-1">
                 <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setVisible(!visible)}>
                    {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
                    <Copy className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}


export default function Passwords() {
  const { credentials, deleteCredential, isLoading, projects } = useFinancials();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<Credential | null>(null);
  const [deletingCredential, setDeletingCredential] = useState<Credential | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const handleEditClick = (credential: Credential) => {
    setEditingCredential(credential);
    setFormOpen(true);
  };
  
  const handleAddClick = () => {
    setEditingCredential(null);
    setFormOpen(true);
  };

  const handleDelete = () => {
    if (!deletingCredential) return;
    deleteCredential(deletingCredential.id);
    toast({ title: "Credential Deleted" });
    setDeletingCredential(null);
  };
  
  const groupedCredentials = useMemo(() => {
    const filtered = credentials.filter(cred => 
      cred.siteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cred.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const grouped: { [key: string]: Credential[] } = {
        'personal': []
    };

    projects.forEach(p => {
        grouped[p.id] = [];
    });

    filtered.forEach(cred => {
        if (cred.projectId && grouped[cred.projectId]) {
            grouped[cred.projectId].push(cred);
        } else {
            grouped['personal'].push(cred);
        }
    });

    // Don't show groups with no credentials, unless it's personal
    for (const key in grouped) {
      if (key !== 'personal' && grouped[key].length === 0) {
        delete grouped[key];
      }
    }

    return grouped;

  }, [credentials, projects, searchTerm]);

  return (
    <Dialog open={formOpen} onOpenChange={(open) => {
        setFormOpen(open);
        if (!open) setEditingCredential(null);
    }}>
      <AlertDialog>
        <Card>
          <CardHeader>
             <div className="flex justify-between items-center mb-4">
              <div>
                <CardTitle>Password Manager</CardTitle>
                <CardDescription>Securely store your passwords and 2FA secrets.</CardDescription>
              </div>
              <Button onClick={handleAddClick}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Credential
              </Button>
            </div>
             <Input 
                placeholder="Search credentials..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
            />
          </CardHeader>
          <CardContent>
             {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : credentials.length > 0 ? (
                <Accordion type="multiple" className="w-full" defaultValue={['personal', ...projects.map(p => p.id)]}>
                    {groupedCredentials.personal?.length > 0 && (
                        <AccordionItem value="personal">
                            <AccordionTrigger>Personal ({groupedCredentials.personal.length})</AccordionTrigger>
                            <AccordionContent>
                                {groupedCredentials.personal.map(cred => (
                                    <CredentialItem key={cred.id} cred={cred} onEdit={handleEditClick} onDelete={setDeletingCredential} />
                                ))}
                            </AccordionContent>
                        </AccordionItem>
                    )}
                    {projects.map(p => groupedCredentials[p.id] && groupedCredentials[p.id].length > 0 && (
                         <AccordionItem value={p.id} key={p.id}>
                            <AccordionTrigger>{p.name} ({groupedCredentials[p.id].length})</AccordionTrigger>
                            <AccordionContent>
                               {groupedCredentials[p.id].map(cred => (
                                    <CredentialItem key={cred.id} cred={cred} onEdit={handleEditClick} onDelete={setDeletingCredential} />
                                ))}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
              ) : (
                <div className="text-center py-10 border-dashed border-2 rounded-md">
                  <p className="text-muted-foreground text-sm">You have no credentials saved yet. Add one to get started!</p>
                </div>
              )}
          </CardContent>
        </Card>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>This action cannot be undone. This will permanently delete this credential.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeletingCredential(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingCredential ? 'Edit Credential' : 'Add a New Credential'}</DialogTitle>
            </DialogHeader>
            <CredentialForm credential={editingCredential} onFinished={() => {
                setFormOpen(false);
                setEditingCredential(null);
            }} />
        </DialogContent>
    </Dialog>
  );
}

type CredentialItemProps = {
    cred: Credential;
    onEdit: (cred: Credential) => void;
    onDelete: (cred: Credential) => void;
};

const CredentialItem = ({ cred, onEdit, onDelete }: CredentialItemProps) => (
    <div className="p-4 group hover:bg-muted/50 border-b last:border-b-0">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <KeyRound className="h-5 w-5 text-muted-foreground" />
                <div>
                    <p className="font-medium">{cred.siteName}</p>
                    <p className="text-sm text-muted-foreground">{cred.username}</p>
                </div>
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
            <Button variant="ghost" size="icon" onClick={() => onEdit(cred)}>
                <Pencil className="h-4 w-4" />
            </Button>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => onDelete(cred)}>
                <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
            </AlertDialogTrigger>
            </div>
        </div>
        <div className="mt-4 space-y-2 pl-9">
            {cred.password && (
                <div>
                    <label className="text-xs font-medium text-muted-foreground">Password</label>
                    <PasswordDisplay value={cred.password} />
                </div>
            )}
            {cred.totpSecret && (
                <div>
                    <label className="text-xs font-medium text-muted-foreground">2FA Secret</label>
                    <PasswordDisplay value={cred.totpSecret} />
                </div>
            )}
        </div>
    </div>
);
