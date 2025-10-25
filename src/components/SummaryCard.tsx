'use client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, HandCoins, ListTodo } from 'lucide-react';

type SummaryCardProps = {
  title: string;
  value: string;
  icon: 'income' | 'expense' | 'debtor' | 'task';
};

const iconMap = {
  income: {
    component: TrendingUp,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/50',
  },
  expense: {
    component: TrendingDown,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/50',
  },
  debtor: {
    component: HandCoins,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/50',
  },
  task: {
    component: ListTodo,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/50',
  },
};

export default function SummaryCard({ title, value, icon }: SummaryCardProps) {
  const { component: Icon, color, bgColor } = iconMap[icon];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={`p-2 rounded-full ${bgColor}`}>
            <Icon className={`h-4 w-4 ${color}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
