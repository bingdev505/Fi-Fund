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
} from 'lucide-react';
import { Sheet, SheetTrigger, SheetContent, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const pathname = usePathname();

  const navItems = [
    { href: '/', icon: Bot, label: 'AI Chat' },
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/entries', icon: BookUser, label: 'Entries' },
    { href: '/reports', icon: BarChart2, label: 'Reports' },
    { href: '/settings', icon: Cog, label: 'Settings' },
  ];

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <div className="flex h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b bg-primary px-4 md:px-6">
        <div className="flex items-center gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
              >
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle Navigation</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
              <div className="flex h-full flex-col">
                <div className="flex h-16 items-center border-b px-6">
                    <h1 className="text-2xl font-headline font-bold text-primary">FinanceFlow AI</h1>
                </div>
                <nav className="grid gap-2 text-lg font-medium p-4">
                  {navItems.map((item) => (
                    <SheetClose asChild key={item.label}>
                      <Link
                        href={item.href}
                        className={cn("flex items-center gap-4 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary", { "bg-muted text-primary": pathname === item.href })}
                      >
                        <item.icon className="h-5 w-5" />
                        {item.label}
                      </Link>
                    </SheetClose>
                  ))}
                </nav>
                 <div className="mt-auto p-4 border-t">
                    <Button variant="ghost" onClick={handleLogout} className="w-full justify-start">
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <h1 className="text-2xl font-headline font-bold text-primary-foreground">
            FinanceFlow AI
          </h1>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-72 flex-col border-r bg-card p-4 md:flex">
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-muted/50 hover:text-primary", { "bg-muted text-primary": pathname === item.href })}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto">
             <Button variant="ghost" onClick={handleLogout} className="w-full justify-start">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
            </Button>
          </div>
        </aside>
        {children}
      </div>
    </div>
  );
}
