'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Users, Tag, LayoutDashboard } from 'lucide-react';

const businessNavItems = [
  { href: '/business', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/business/clients', label: 'Clients', icon: Users },
  { href: '/business/categories', label: 'Categories', icon: Tag },
];

export default function BusinessShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="grid h-full grid-cols-[220px_1fr]">
        <div className="flex-col border-r bg-card hidden md:flex">
            <div className="flex-1">
                <nav className="grid items-start p-4 text-sm font-medium">
                    {businessNavItems.map(item => {
                        const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                        return (
                            <Link href={item.href} key={item.href}>
                                <span className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                                    isActive && "bg-muted text-primary"
                                )}>
                                    <item.icon className="h-4 w-4" />
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </div>
        <div className="p-4 md:p-8">
            <main>{children}</main>
        </div>
    </div>
  );
}
