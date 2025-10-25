'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Users, Tag, List } from 'lucide-react';

const businessNavItems = [
  { href: '/business', label: 'Dashboard', icon: List, exact: true },
  { href: '/business/clients', label: 'Clients', icon: Users },
  { href: '/business/categories', label: 'Categories', icon: Tag },
];

export default function BusinessShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center space-x-2 overflow-x-auto pb-2">
        {businessNavItems.map(item => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link href={item.href} key={item.href} passHref>
              <Button variant={isActive ? 'default' : 'outline'} className="shrink-0">
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </div>
      <main>{children}</main>
    </div>
  );
}
