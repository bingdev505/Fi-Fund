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


export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { projects, activeProject, setActiveProject, isLoading: isFinancialsLoading } = useFinancials();
  const [open, setOpen] = useState(false);


  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const navItems = [
    { href: '/overview', icon: LayoutDashboard, label: 'Overview' },
    { href: '/entries', icon: BookUser, label: 'Entries' },
    { href: '/reports', icon: BarChart2, label: 'Reports' },
    { href: '/ai-chat', icon: Bot, label: 'AI Chat' },
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

  return (
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
            </nav>
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
              <nav className="grid gap-2 text-lg font-medium p-4">
                {navItems.map((item) => (
                   <SheetClose asChild key={item.label}>
                      <Link
                        href={item.href}
                        className={cn("flex items-center gap-4 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary", { "bg-sidebar-accent text-primary": pathname === item.href })}
                      >
                        <item.icon className="h-5 w-5" />
                        {item.label}
                      </Link>
                    </SheetClose>
                ))}
                 <Separator className="my-2 bg-sidebar-border" />
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
                    <Folder className='mr-2' />
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
                            <CommandItem onSelect={() => router.push('/settings')}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Create Project
                            </CommandItem>
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
        <div className="flex-1 relative bg-muted/40">
            {children}
        </div>
      </div>
    </div>
  );
}
