'use client';
import Link from 'next/link';
import {
  Bot,
  BarChart2,
  LayoutDashboard,
  Menu,
  Cog,
  LogOut,
  Loader2,
  User,
  Briefcase,
  Wallet,
  ListTodo,
  KeyRound,
  Contact,
  ArrowRightLeft,
} from 'lucide-react';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
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
import type { Project } from '@/lib/types';
import ProjectForm from './ProjectForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import ProjectSwitcher from './ProjectSwitcher';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading: isUserLoading, signOut } = useAuth();
  const [addProjectOpen, setAddProjectOpen] = useState(false);

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
    { href: '/business', icon: Briefcase, label: 'Business' },
    { href: '/reports', icon: BarChart2, label: 'Reports' },
  ];
  

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (isUserLoading) {
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
    setOpen(false);
  }
  
  const NavContent = () => (
    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
      {navItems.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className={cn("flex items-center gap-3 rounded-lg px-3 py-3 text-muted-foreground transition-all hover:bg-sidebar-accent hover:text-primary", { "bg-sidebar-accent text-primary font-medium": pathname.startsWith(item.href) })}
        >
          <item.icon className="h-5 w-5" />
          {item.label}
        </Link>
      ))}
    </nav>
  );

  const isChatPage = pathname === '/ai-chat';

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
      <div className="flex flex-col overflow-hidden">
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6 shrink-0">
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
              <div className="mt-auto p-4">
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
                </div>
            </SheetContent>
          </Sheet>
          
          <div className="w-full flex-1" />

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
        <main className={cn(
            "flex-1 overflow-auto bg-muted/40",
            !isChatPage && "p-4 md:p-6"
        )}>
            {children}
        </main>
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
