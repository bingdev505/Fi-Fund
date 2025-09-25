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
  CircleUserRound,
} from 'lucide-react';
import { Sheet, SheetTrigger, SheetContent, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useUser } from '@/firebase';
import { useEffect } from 'react';
import { Avatar, AvatarFallback } from './ui/avatar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/entries', icon: BookUser, label: 'Entries' },
    { href: '/reports', icon: BarChart2, label: 'Reports' },
    { href: '/settings', icon: Cog, label: 'Settings' },
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

  return (
    <div className="flex h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-20 items-center justify-between gap-4 border-b bg-card px-4 md:px-6">
        <div className="flex items-center gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="md:hidden text-foreground"
              >
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle Navigation</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
              <div className="flex h-full flex-col">
                <div className="flex h-20 items-center border-b px-6">
                    <h1 className="text-2xl font-headline font-bold text-foreground">FinanceFlow</h1>
                </div>
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
                </nav>
                 <div className="mt-auto p-4 border-t">
                    <Button variant="ghost" onClick={handleLogout} className="w-full justify-start text-muted-foreground">
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <div className="hidden md:flex items-center gap-2">
            <div className="w-8 h-8 bg-foreground text-background flex items-center justify-center rounded-md font-bold text-lg">
                F
            </div>
            <h1 className="text-xl font-headline font-bold text-foreground">
              Financial Dashboard
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
            <Avatar>
                <AvatarFallback><CircleUserRound /></AvatarFallback>
            </Avatar>
            <div>
                <p className="font-semibold text-sm">{user.email}</p>
                <p className="text-xs text-muted-foreground">User</p>
            </div>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-64 flex-col border-r bg-card p-4 md:flex">
          <nav className="flex flex-col gap-2">
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
          <div className="mt-auto">
             <Button variant="ghost" onClick={handleLogout} className="w-full justify-start text-muted-foreground">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
            </Button>
          </div>
        </aside>
        <div className='flex-1 overflow-y-auto'>
            {children}
        </div>
      </div>
    </div>
  );
}
