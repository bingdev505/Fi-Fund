'use client';
import Link from 'next/link';
import {
  Bot,
  BarChart2,
  LayoutDashboard,
  Menu,
  BookUser,
  Cog,
  LogOut,
  Loader2,
  User,
  ChevronsUpDown,
  PlusCircle,
  Folder,
  Briefcase,
  Users,
  Tag,
  ChevronRight,
  Landmark,
  HandCoins,
  ArrowRightLeft,
  Wallet,
  ListTodo,
  KeyRound,
} from 'lucide-react';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useUser } from '@/firebase';
import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useFinancials } from '@/hooks/useFinancials';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from './ui/command';
import type { Project } from '@/lib/types';
import { Separator } from './ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import ProjectForm from './ProjectForm';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui/collapsible';

const ALL_BUSINESS_PROJECT: Project = { id: 'all', name: 'All Business', userId: '', createdAt: new Date().toISOString() };

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { projects, activeProject, setActiveProject, isLoading: isFinancialsLoading } = useFinancials();
  const [open, setOpen] = useState(false);
  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [isBusinessMenuOpen, setIsBusinessMenuOpen] = useState(pathname.startsWith('/business'));
  const [isFinanceMenuOpen, setIsFinanceMenuOpen] = useState(pathname.startsWith('/transactions') || pathname.startsWith('/debts') || pathname.startsWith('/reports'));


  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const navItems = [
    { href: '/overview', icon: LayoutDashboard, label: 'Overview' },
    { href: '/ai-chat', icon: Bot, label: 'AI Chat' },
    { href: '/tasks', icon: ListTodo, label: 'Tasks' },
    { href: '/passwords', icon: KeyRound, label: 'Passwords' },
  ];
  
  const financeNavItems = [
    { href: '/transactions', icon: ArrowRightLeft, label: 'Transactions' },
    { href: '/debts', icon: HandCoins, label: 'Debts' },
    { href: '/reports', icon: BarChart2, label: 'Reports' },
  ];

  const businessNavItems = [
    { href: '/business', label: 'Dashboard', icon: Briefcase },
    { href: '/business/clients', label: 'Clients', icon: Users },
    { href: '/business/categories', label: 'Categories', icon: Tag },
    { href: '/business/accounts', label: 'Accounts', icon: Landmark },
  ];

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (isUserLoading || isFinancialsLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }
  
  if (!user) {
    return null;
  }

  const handleProjectSelect = (project: Project) => {
    setActiveProject(project);
    setOpen(false);
  }
  
  const NavContent = () => (
    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
      {navItems.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className={cn("flex items-center gap-3 rounded-lg px-3 py-3 text-muted-foreground transition-all hover:bg-sidebar-accent hover:text-primary", { "bg-sidebar-accent text-primary font-medium": pathname === item.href })}
        >
          <item.icon className="h-5 w-5" />
          {item.label}
        </Link>
      ))}
      <Collapsible open={isFinanceMenuOpen} onOpenChange={setIsFinanceMenuOpen}>
        <CollapsibleTrigger asChild>
          <button
            className={cn("flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-muted-foreground transition-all hover:bg-sidebar-accent hover:text-primary", { "bg-sidebar-accent text-primary font-medium": pathname.startsWith('/transactions') || pathname.startsWith('/debts') || pathname.startsWith('/reports') })}
          >
            <div className="flex items-center gap-3">
              <Wallet className="h-5 w-5" />
              <span>Finance</span>
            </div>
            <ChevronRight className={cn("h-5 w-5 transition-transform", isFinanceMenuOpen && "rotate-90")} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ml-7 mt-2 flex flex-col gap-1 border-l pl-4">
            {financeNavItems.map(item => (
              <Link key={item.label} href={item.href} className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-primary", { "bg-sidebar-accent text-primary font-medium": pathname === item.href })}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
      <Collapsible open={isBusinessMenuOpen} onOpenChange={setIsBusinessMenuOpen}>
        <CollapsibleTrigger asChild>
          <button
            className={cn("flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-muted-foreground transition-all hover:bg-sidebar-accent hover:text-primary", { "bg-sidebar-accent text-primary font-medium": pathname.startsWith('/business') })}
          >
            <div className="flex items-center gap-3">
              <Briefcase className="h-5 w-5" />
              <span>Business</span>
            </div>
            <ChevronRight className={cn("h-5 w-5 transition-transform", isBusinessMenuOpen && "rotate-90")} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ml-7 mt-2 flex flex-col gap-1 border-l pl-4">
            {businessNavItems.map(item => (
              <Link key={item.label} href={item.href} className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-primary", { "bg-sidebar-accent text-primary font-medium": pathname === item.href })}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </nav>
  );

  return (
    <Dialog open={addProjectOpen} onOpenChange={setAddProjectOpen}>
    <div className="grid h-screen w-full md:grid-cols-[180px_1fr] lg:grid-cols-[240px_1fr]">
      <div className="hidden border-r bg-card md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <div className="w-8 h-8 bg-primary text-primary-foreground flex items-center justify-center rounded-md font-bold text-lg">
                F
              </div>
              <span className="">FinanceFlow</span>
            </Link>
          </div>
          <div className="flex-1">
            <NavContent />
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0">
               <SheetHeader className='p-4 border-b'>
                 <SheetTitle className="sr-only">Menu</SheetTitle>
                 <Link href="/" className="flex items-center gap-2 font-semibold">
                    <div className="w-8 h-8 bg-primary text-primary-foreground flex items-center justify-center rounded-md font-bold text-lg">
                      F
                    </div>
                    <span className="">FinanceFlow</span>
                  </Link>
              </SheetHeader>
              <div className="p-4">
                <NavContent />
              </div>
                 <Separator className="my-2 bg-sidebar-border" />
                 <nav className="grid gap-2 p-4">
                 <SheetClose asChild>
                    <Link
                        href={'/settings'}
                        className={cn("flex items-center gap-4 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary", { "bg-sidebar-accent text-primary": pathname === '/settings' })}
                    >
                        <Cog className="h-5 w-5" />
                        Settings
                    </Link>
                 </SheetClose>
                  <div
                    onClick={handleLogout}
                    className={cn("flex items-center gap-4 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary cursor-pointer")}
                  >
                    <LogOut className="h-5 w-5" />
                    Logout
                  </div>
              </nav>
            </SheetContent>
          </Sheet>
          
          <div className="w-full flex-1">
             <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-[200px] justify-between"
                  >
                    <Folder className="mr-2 h-4 w-4" />
                    {activeProject ? activeProject.name : "Select project..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput placeholder="Search project..." />
                    <CommandList>
                        <CommandEmpty>No project found.</CommandEmpty>
                        <CommandGroup>
                        <CommandItem
                            key={ALL_BUSINESS_PROJECT.id}
                            value={ALL_BUSINESS_PROJECT.name}
                            onSelect={() => handleProjectSelect(ALL_BUSINESS_PROJECT)}
                            >
                            {ALL_BUSINESS_PROJECT.name}
                            </CommandItem>
                        {projects && projects.map((project) => (
                            <CommandItem
                            key={project.id}
                            value={project.name}
                            onSelect={() => handleProjectSelect(project)}
                            >
                            {project.name}
                            </CommandItem>
                        ))}
                        </CommandGroup>
                    </CommandList>
                    <CommandSeparator />
                     <CommandList>
                        <CommandGroup>
                            <DialogTrigger asChild>
                                <CommandItem onSelect={() => setAddProjectOpen(true)}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Create Business
                                </CommandItem>
                            </DialogTrigger>
                        </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar>
                  <AvatarFallback><User /></AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/settings')}>
                <Cog className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <div className="flex-1 relative bg-muted/40 p-4 md:p-6">
            {children}
        </div>
      </div>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new Business</DialogTitle>
        </DialogHeader>
        <ProjectForm onFinished={() => setAddProjectOpen(false)}/>
      </DialogContent>
    </div>
    </Dialog>
  );
}
