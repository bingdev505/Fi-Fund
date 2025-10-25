'use client';
import { useFinancials } from '@/hooks/useFinancials';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowRight, ListTodo, HandCoins, Heart, PlusCircle, CheckCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from './ui/button';
import Link from 'next/link';
import EntryList from './EntryList';
import { useUser } from '@/firebase';
import { format, isToday, isFuture } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import EntryForm from './EntryForm';
import TaskForm from './Tasks';
import { Hobby, HobbySession, Task } from '@/lib/types';
import HobbySessionForm from './HobbySessionForm';
import SummaryCard from './SummaryCard';

export default function Overview() {
  const { transactions, debts, currency, isLoading, bankAccounts, tasks, hobbies, hobbySessions } = useFinancials();
  const { user } = useUser();
  const [entryFormOpen, setEntryFormOpen] = useState(false);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [sessionFormOpen, setSessionFormOpen] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  }

  const {
    totalIncome,
    totalExpenses,
    netBalance,
    primaryAccount,
    totalDebtors,
    totalCreditors,
    tasksDueToday,
    upcomingTasks
  } = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    
    let primaryAcc = bankAccounts.find(acc => acc.isPrimary) || bankAccounts[0];

    const debtors = debts.filter(d => d.type === 'debtor' && d.amount > 0).reduce((sum, d) => sum + d.amount, 0);
    const creditors = debts.filter(d => d.type === 'creditor' && d.amount > 0).reduce((sum, d) => sum + d.amount, 0);
    
    const now = new Date();
    const todayTasks = tasks.filter(t => t.dueDate && isToday(new Date(t.dueDate)) && t.status !== 'done');
    const futureTasks = tasks.filter(t => t.dueDate && isFuture(new Date(t.dueDate)) && t.status !== 'done').slice(0, 5);


    return {
      totalIncome: income,
      totalExpenses: expenses,
      netBalance: income - expenses,
      primaryAccount: primaryAcc,
      totalDebtors: debtors,
      totalCreditors: creditors,
      tasksDueToday: todayTasks.length,
      upcomingTasks: futureTasks,
    };
  }, [transactions, bankAccounts, debts, tasks]);
  
  const recentHobbySessions = useMemo(() => {
    return hobbySessions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3);
  }, [hobbySessions]);

  const getHobbyName = (hobbyId: string) => hobbies.find(h => h.id === hobbyId)?.name || 'Hobby';

  if (isLoading) {
    // A more detailed skeleton can be built here if desired
    return <div>Loading...</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Dialog open={entryFormOpen} onOpenChange={setEntryFormOpen}>
      <Dialog open={taskFormOpen} onOpenChange={setTaskFormOpen}>
      <Dialog open={sessionFormOpen} onOpenChange={setSessionFormOpen}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.email?.split('@')[0] || 'User'}!</h1>
            <p className="text-muted-foreground">Here's your full overview for {format(new Date(), 'MMMM d, yyyy')}.</p>
          </div>
          <div className="flex items-center gap-2">
            <DialogTrigger asChild>
                <Button onClick={() => setEntryFormOpen(true)}><PlusCircle className="mr-2" /> New Transaction</Button>
            </DialogTrigger>
            <DialogTrigger asChild>
                <Button variant="secondary" onClick={() => setTaskFormOpen(true)}><PlusCircle className="mr-2" /> New Task</Button>
            </DialogTrigger>
            <DialogTrigger asChild>
                <Button variant="secondary" onClick={() => setSessionFormOpen(true)}><PlusCircle className="mr-2" /> Log Session</Button>
            </DialogTrigger>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard title="Total Income" value={formatCurrency(totalIncome)} icon="income" />
          <SummaryCard title="Total Expenses" value={formatCurrency(totalExpenses)} icon="expense" />
          <SummaryCard title="Owed to You" value={formatCurrency(totalDebtors)} icon="debtor" />
          <SummaryCard title="Tasks Due Today" value={tasksDueToday.toString()} icon="task" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Your latest financial movements.</CardDescription>
              </CardHeader>
              <CardContent>
                <EntryList limit={5} showHeader={false} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upcoming Tasks</CardTitle>
                <CardDescription>Stay on top of your upcoming deadlines.</CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingTasks.length > 0 ? (
                  <ul className="space-y-3">
                    {upcomingTasks.map(task => (
                      <li key={task.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                        <div className="font-medium">{task.name}</div>
                        <div className="text-sm text-muted-foreground">{format(new Date(task.dueDate!), 'PP')}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <CheckCircle className="mx-auto h-8 w-8 mb-2" />
                    <p>No upcoming tasks. You're all clear!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Primary Account</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{primaryAccount ? formatCurrency(primaryAccount.balance) : formatCurrency(0)}</p>
                <p className="text-xs text-muted-foreground">{primaryAccount?.name || 'No account set'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Debt Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div className='flex justify-between items-center'>
                    <span className='text-muted-foreground'>Owed to you</span>
                    <span className='font-bold text-green-600'>{formatCurrency(totalDebtors)}</span>
                  </div>
                  <div className='flex justify-between items-center'>
                    <span className='text-muted-foreground'>You owe</span>
                    <span className='font-bold text-red-600'>{formatCurrency(totalCreditors)}</span>
                  </div>
                   <Link href="/debts" className="!mt-6">
                        <Button variant="outline" className="w-full">
                            Manage Debts <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
              </CardContent>
            </Card>
             <Card>
              <CardHeader>
                <CardTitle>Recent Hobby Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                {recentHobbySessions.length > 0 ? (
                  <ul className="space-y-3">
                    {recentHobbySessions.map(session => (
                      <li key={session.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Heart className="h-4 w-4 text-red-500" />
                          <span>{getHobbyName(session.hobbyId)}</span>
                        </div>
                        <span className="font-medium">{session.duration} min</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-center text-muted-foreground py-4">No sessions logged recently.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Dialog Contents */}
        <DialogContent><DialogHeader><DialogTitle>Add New Transaction</DialogTitle></DialogHeader><EntryForm onFinished={() => setEntryFormOpen(false)} /></DialogContent>
        <DialogContent><DialogHeader><DialogTitle>Add New Task</DialogTitle></DialogHeader><TaskForm onFinished={() => setTaskFormOpen(false)} /></DialogContent>
        <DialogContent><DialogHeader><DialogTitle>Log Hobby Session</DialogTitle></DialogHeader><HobbySessionForm onFinished={() => setSessionFormOpen(false)} /></DialogContent>
      </Dialog>
      </Dialog>
      </Dialog>
    </div>
  );
}
