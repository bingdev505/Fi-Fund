'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import type { Transaction } from '@/lib/types';
import { useMemo } from 'react';
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  format as formatDate,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns';
import { useFinancials } from '@/hooks/useFinancials';


type FinancialChartProps = {
  transactions: Transaction[];
  period: 'weekly' | 'monthly' | 'annual';
};

const chartConfig = {
  income: {
    label: 'Income',
    color: 'hsl(var(--chart-1))',
  },
  expenses: {
    label: 'Expenses',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;

export default function FinancialChart({ transactions, period }: FinancialChartProps) {
    const { currency } = useFinancials();

    const formatCurrency = (value: number) => {
        const num = Number(value);
        if (num === 0) return '₹0';
        if (num >= 1000) {
            return new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency,
                notation: 'compact',
                compactDisplay: 'short'
            }).format(num);
        }
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
    }
    
    const data = useMemo(() => {
        if (transactions.length === 0) return [];
    
        const now = new Date();
        let intervals: Date[];
        let getIntervalEnd: (date: Date) => Date;
        let dateFormat: string | ((date: Date, index: number) => string);
    
        switch (period) {
            case 'weekly':
                intervals = eachDayOfInterval({ start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) });
                getIntervalEnd = endOfDay;
                dateFormat = 'EEE'; // Mon, Tue
                break;
            case 'monthly':
                intervals = eachWeekOfInterval({ start: startOfMonth(now), end: endOfMonth(now) }, { weekStartsOn: 1 });
                getIntervalEnd = (date) => endOfWeek(date, { weekStartsOn: 1 });
                dateFormat = (_date, index) => `Week ${index + 1}`; // Week 1, Week 2
                break;
            case 'annual':
            default:
                intervals = eachMonthOfInterval({ start: startOfYear(now), end: endOfYear(now) });
                getIntervalEnd = endOfMonth;
                dateFormat = 'MMM'; // Jan, Feb
                break;
        }
    
        return intervals.map((intervalStart, index) => {
            const intervalEnd = getIntervalEnd(intervalStart);
            const periodTransactions = transactions.filter(t => t.date >= intervalStart && t.date <= intervalEnd);
    
            const income = periodTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
            const expenses = periodTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
            
            const label = typeof dateFormat === 'function' ? dateFormat(intervalStart, index) : formatDate(intervalStart, dateFormat);
    
            return { date: label, income, expenses };
        });
    }, [transactions, period]);

  if (transactions.length === 0) {
    return <div className="h-[350px] w-full flex items-center justify-center text-muted-foreground">Add some transaction data to see the report.</div>
  }

  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full h-[350px]">
      <BarChart accessibilityLayer data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) => value}
        />
        <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            tickFormatter={formatCurrency}
        />
        <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent
                labelFormatter={(label, payload) => {
                    return payload?.[0]?.payload.date
                }}
                indicator="dot" 
                formatter={(value, name, item) => {
                    return (
                        <div className="flex flex-col">
                            <span className="capitalize">{name}</span>
                            <span>{formatCurrency(Number(value))}</span>
                        </div>
                    )
                }}
            />}
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="income" fill="var(--color-income)" radius={4} />
        <Bar dataKey="expenses" fill="var(--color-expenses)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
