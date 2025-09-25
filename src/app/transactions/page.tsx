'use client';
import Link from 'next/link';
import { Bot, BarChart2, LayoutDashboard, ArrowRightLeft, Users, Menu } from 'lucide-react';
import { FinancialProvider } from '@/context/FinancialContext';
import Transactions from '@/components/Transactions';
import { Sheet, SheetTrigger, SheetContent, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

export default function TransactionsPage() {
  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/transactions', icon: ArrowRightLeft, label: 'Transactions' },
    { href: '/debts', icon: Users, label: 'Debts' },
    { href: '/reports', icon: BarChart2, label: 'Reports' },
    { href: '/', icon: Bot, label: 'AI Chat' },
  ];

  return (
    <FinancialProvider>
      <div className="flex h-screen w-full flex-col bg-background">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b bg-primary px-4 md:px-6">
          <h1 className="text-2xl font-headline font-bold text-primary-foreground">FinanceFlow AI</h1>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle Navigation</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <nav className="grid gap-2 text-lg font-medium mt-8">
                {navItems.map(item => (
                  <SheetClose asChild key={item.label}>
                    <Link href={item.href} className="flex items-center gap-4 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  </SheetClose>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </header>
        <div className="flex flex-1">
          <aside className="hidden w-64 flex-col border-r bg-card p-4 md:flex">
            <nav className="flex flex-col gap-2">
              {navItems.map(item => (
                <Link key={item.label} href={item.href} className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-muted/50 hover:text-primary">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
          <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <Transactions />
          </main>
        </div>
      </div>
    </FinancialProvider>
  );
}
