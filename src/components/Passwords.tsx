
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFinancials } from '@/hooks/useFinancials';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PlusCircle, KeyRound, Pencil, Trash2, Eye, EyeOff, Copy } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import type { Credential } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import * as OTPAuth from "otpauth";
import { Progress } from './ui/progress';

const credentialSchema = z.object({
  site_name: z.string().min(2, 'Site name must be at least 2 characters'),
  username: z.string().min(2, 'Username must be at least 2 characters'),
  password: z.string().optional(),
  totp_secret: z.string().optional(),
  project_id: z.string().optional(),
});

type CredentialFormProps = {
    credential?: Credential | null;
    onFinished: () => void;
};

function CredentialForm({ credential, onFinished }: CredentialFormProps) {
    const { addCredential, updateCredential, projects, activeProject } = useFinancials();
    const { toast } = useToast();
    const personalProject = useMemo(() => projects.find(p => p.name === 'Personal'), [projects]);

    const form = useForm<z.infer<typeof credentialSchema>>({
        resolver: zodResolver(credentialSchema),
        defaultValues: credential ? {
            site_name: credential.site_name,
            username: credential.username,
            password: credential.password || '',
            totp_secret: credential.totp_secret || '',
            project_id: credential.project_id || personalProject?.id,
        } : {
            site_name: '',
            username: '',
            password: '',
            totp_secret: '',
            project_id: activeProject?.id !== 'all' ? activeProject?.id : personalProject?.id,
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
                <FormField control={form.control} name="site_name" render={({ field }) => (
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
                <FormField control={form.control} name="totp_secret" render={({ field }) => (
                    <FormItem>
                        <FormLabel>2FA Secret Key (TOTP)</FormLabel>
                        <FormControl><Input placeholder="Enter TOTP secret" {...field} value={field.value || ''} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
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

function TotpDisplay({ secret }: { secret: string }) {
    const [token, setToken] = useState<string | null>(null);
    const [remaining, setRemaining] = useState(30);
    const { toast } = useToast();
  
    useEffect(() => {
      let totp: OTPAuth.TOTP;
      try {
        totp = new OTPAuth.TOTP({
            issuer: "fi-fund",
            label: "Fi-Fund",
            algorithm: "SHA1",
            digits: 6,
            period: 30,
            secret: secret,
        });
      } catch (e) {
        console.error("Invalid TOTP Secret", e);
        return;
      }
  
      const updateToken = () => {
        const newToken = totp.generate();
        setToken(newToken);
        const newRemaining = totp.period - (Math.floor(Date.now() / 1000) % totp.period);
        setRemaining(newRemaining);
      };
  
      updateToken();
      const interval = setInterval(updateToken, 1000);
  
      return () => clearInterval(interval);
    }, [secret]);

    const handleCopy = () => {
        if (token) {
            navigator.clipboard.writeText(token);
            toast({ title: 'TOTP code copied!' });
        }
    }
  
    if (!token) {
      return (
        <div className="text-xs text-destructive">Invalid TOTP secret provided.</div>
      );
    }
  
    return (
        <div className="space-y-2">
             <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
                <span className="font-mono text-2xl tracking-widest text-center w-full">
                    {token.slice(0, 3)} {token.slice(3)}
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
                    <Copy className="h-4 w-4" />
                </Button>
            </div>
            <Progress value={(remaining / 30) * 100} className="h-1" />
        </div>
    );
}

export default function Passwords() {
  const { credentials, deleteCredential, projects } = useFinancials();
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
      cred.site_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cred.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const grouped: { [key: string]: Credential[] } = {};
    
    projects.forEach(p => {
        grouped[p.id] = [];
    });

    filtered.forEach(cred => {
        const projectId = cred.project_id;
        if (projectId && grouped[projectId]) {
            grouped[projectId].push(cred);
        } else if (projectId && !grouped[projectId]) {
           grouped[projectId] = [cred];
        }
    });

    for (const key in grouped) {
      if (grouped[key].length === 0) {
        delete grouped[key];
      }
    }

    return grouped;

  }, [credentials, projects, searchTerm]);
  
  const personalProject = useMemo(() => projects.find(p => p.name === 'Personal'), [projects]);

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
             {credentials.length > 0 ? (
                <Accordion type="multiple" className="w-full" defaultValue={personalProject ? [personalProject.id] : []}>
                    {Object.entries(groupedCredentials).map(([projectId, creds]) => {
                         const project = projects.find(p => p.id === projectId);
                         if (!project || creds.length === 0) return null;

                         return (
                            <AccordionItem value={projectId} key={projectId}>
                                <AccordionTrigger>{project.name} ({creds.length})</AccordionTrigger>
                                <AccordionContent>
                                {creds.map(cred => (
                                        <CredentialItem key={cred.id} cred={cred} onEdit={handleEditClick} onDelete={setDeletingCredential} />
                                    ))}
                                </AccordionContent>
                            </AccordionItem>
                         )
                    })}
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
    <div className="p-4 group hover-mobile-bg-muted border-b last:border-b-0">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <KeyRound className="h-5 w-5 text-muted-foreground" />
                <div>
                    <p className="font-medium">{cred.site_name}</p>
                    <p className="text-sm text-muted-foreground">{cred.username}</p>
                </div>
            </div>
            <div className="group-hover-mobile-opacity flex items-center">
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
        <div className="mt-4 space-y-4 pl-9">
            {cred.password && (
                <div>
                    <label className="text-xs font-medium text-muted-foreground">Password</label>
                    <PasswordDisplay value={cred.password} />
                </div>
            )}
            {cred.totp_secret && (
                <div>
                    <label className="text-xs font-medium text-muted-foreground">One-Time Password</label>
                    <TotpDisplay secret={cred.totp_secret} />
                </div>
            )}
        </div>
    </div>
);
