'use client';

import { createContext, useCallback, ReactNode, useMemo, useState, useEffect } from 'react';
import type { Transaction, Debt, BankAccount, UserSettings, Project, Client, Category, Task, Credential } from '@/lib/types';
import { supabase } from '@/lib/supabase_client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './AuthContext';

interface FinancialContextType {
  projects: Project[];
  activeProject: Project | null;
  setActiveProject: (project: Project | null) => void;
  defaultProject: Project | null;
  setDefaultProject: (project: Project | null) => void;
  addProject: (projectData: Omit<Project, 'id' | 'userId' | 'createdAt'>) => Promise<Project>;
  updateProject: (projectId: string, projectData: Partial<Omit<Project, 'id' | 'userId' | 'createdAt'>>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  
  transactions: Transaction[];
  allTransactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'date' | 'userId'>, returnRef?: boolean) => Promise<{ id: string } | void>;
  updateTransaction: (originalTransaction: Transaction, updatedData: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (transaction: Transaction) => Promise<void>;
  getTransactionById: (id: string) => Transaction | undefined;
  
  debts: Debt[];
  addDebt: (debt: Omit<Debt, 'id' | 'date' | 'userId'>, returnRef?: boolean) => Promise<{ id: string } | void>;
  updateDebt: (originalDebt: Debt, updatedData: Partial<Debt>) => Promise<void>;
  deleteDebt: (debt: Debt) => Promise<void>;
  addRepayment: (debt: Debt, amount: number, accountId: string) => Promise<void>;
  getDebtById: (id: string) => Debt | undefined;

  bankAccounts: BankAccount[];
  addBankAccount: (account: Omit<BankAccount, 'id' | 'userId'>) => Promise<void>;
  updateBankAccount: (accountId: string, accountData: Partial<Omit<BankAccount, 'id' | 'userId'>>) => Promise<void>;
  deleteBankAccount: (accountId: string) => Promise<void>;
  setPrimaryBankAccount: (accountId: string) => Promise<void>;
  
  clients: Client[];
  addClient: (clientData: Omit<Client, 'id' | 'userId' | 'projectId'>, projectId?: string) => Promise<Client>;
  updateClient: (clientId: string, clientData: Partial<Omit<Client, 'id'>>) => Promise<void>;
  deleteClient: (clientId: string) => Promise<void>;

  categories: Category[];
  addCategory: (categoryData: Omit<Category, 'id' | 'userId'>, projectId?: string) => Promise<void>;
  updateCategory: (categoryId: string, categoryData: Partial<Omit<Category, 'id'>>) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  
  tasks: Task[];
  addTask: (taskData: Omit<Task, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  updateTask: (taskId: string, taskData: Partial<Omit<Task, 'id' | 'userId' | 'createdAt'>>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  
  credentials: Credential[];
  addCredential: (credentialData: Omit<Credential, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  updateCredential: (credentialId: string, credentialData: Partial<Omit<Credential, 'id' | 'userId' | 'createdAt'>>) => Promise<void>;
  deleteCredential: (credentialId: string) => Promise<void>;

  currency: string;
  setCurrency: (currency: string) => void;
  isLoading: boolean;
}

export const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

const useLocalStorageKey = (key: string) => {
  const { user } = useAuth();
  return user ? `financeflow_${user.id}_${key}` : null;
};

const ALL_BUSINESS_PROJECT: Project = { id: 'all', name: 'All Business', userId: '', createdAt: new Date().toISOString() };


export function FinancialProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: isUserLoading } = useAuth();
  const { toast } = useToast();

  const activeProjectKey = useLocalStorageKey('activeProject');
  const defaultProjectKey = useLocalStorageKey('defaultProject');
  const currencyKey = useLocalStorageKey('currency');

  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [activeProject, _setActiveProject] = useState<Project | null>(ALL_BUSINESS_PROJECT);
  const [defaultProject, _setDefaultProject] = useState<Project | null>(ALL_BUSINESS_PROJECT);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [allDebts, setAllDebts] = useState<Debt[]>([]);
  const [allBankAccounts, setAllBankAccounts] = useState<BankAccount[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [allCredentials, setAllCredentials] = useState<Credential[]>([]);
  
  const [currency, setCurrencyState] = useState<string>('INR');
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async (userId: string) => {
    setIsLoading(true);
    try {
      const [
        projects,
        transactions,
        debts,
        bankAccounts,
        clients,
        categories,
        tasks,
        credentials
      ] = await Promise.all([
        supabase.from('projects').select('*').eq('userId', userId).then(res => res.data || []),
        supabase.from('transactions').select('*').eq('userId', userId).then(res => res.data || []),
        supabase.from('debts').select('*').eq('userId', userId).then(res => res.data || []),
        supabase.from('bank_accounts').select('*').eq('userId', userId).then(res => res.data || []),
        supabase.from('clients').select('*').eq('userId', userId).then(res => res.data || []),
        supabase.from('categories').select('*').eq('userId', userId).then(res => res.data || []),
        supabase.from('tasks').select('*').eq('userId', userId).then(res => res.data || []),
        supabase.from('credentials').select('*').eq('userId', userId).then(res => res.data || []),
      ]);

      setAllProjects(projects as Project[]);
      setAllTransactions(transactions as Transaction[]);
      setAllDebts(debts as Debt[]);
      setAllBankAccounts(bankAccounts as BankAccount[]);
      setAllClients(clients as Client[]);
      setAllCategories(categories as Category[]);
      setAllTasks(tasks as Task[]);
      setAllCredentials(credentials as Credential[]);

      if ((bankAccounts as BankAccount[]).length === 0) {
        const { data: newAccount } = await supabase.from('bank_accounts').insert({ userId: userId, name: 'Primary Account', balance: 0, isPrimary: true }).select().single();
        if (newAccount) setAllBankAccounts([newAccount]);
      }

      // Restore non-db state from local storage
      const storedCurrency = currencyKey ? localStorage.getItem(currencyKey) || 'INR' : 'INR';
      setCurrencyState(storedCurrency);
      
      const storedDefaultProject = defaultProjectKey ? JSON.parse(localStorage.getItem(defaultProjectKey) || 'null') : null;
      let activeProjectToSet = storedDefaultProject;
      const storedActiveProject = activeProjectKey ? JSON.parse(localStorage.getItem(activeProjectKey) || 'null') : null;
      if (storedActiveProject) activeProjectToSet = storedActiveProject;
      
      if (activeProjectToSet && (activeProjectToSet.id === 'all' || projects.some((p: Project) => p.id === activeProjectToSet.id))) {
        _setActiveProject(activeProjectToSet);
      } else {
        _setActiveProject(ALL_BUSINESS_PROJECT);
      }
       if (storedDefaultProject && (storedDefaultProject.id === 'all' || projects.some((p: Project) => p.id === storedDefaultProject.id))) {
        _setDefaultProject(storedDefaultProject);
      } else {
        _setDefaultProject(ALL_BUSINESS_PROJECT);
      }

    } catch (error) {
      console.error("Error fetching data from Supabase:", error);
      toast({ variant: 'destructive', title: 'Error fetching data', description: 'Could not load your financial data.' });
    } finally {
      setIsLoading(false);
    }
  }, [toast, currencyKey, defaultProjectKey, activeProjectKey]);

  useEffect(() => {
    if (user && !isUserLoading) {
      fetchData(user.id);
      
      const changes = supabase.channel('financial-changes')
        .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
            console.log('Change received!', payload);
            if (payload.eventType === 'INSERT') {
                const { table, new: newRecord } = payload;
                if (table === 'projects') setAllProjects(prev => [...prev, newRecord as Project]);
                if (table === 'transactions') setAllTransactions(prev => [...prev, newRecord as Transaction]);
                if (table === 'debts') setAllDebts(prev => [...prev, newRecord as Debt]);
                if (table === 'bank_accounts') setAllBankAccounts(prev => [...prev, newRecord as BankAccount]);
                if (table === 'clients') setAllClients(prev => [...prev, newRecord as Client]);
                if (table === 'categories') setAllCategories(prev => [...prev, newRecord as Category]);
                if (table === 'tasks') setAllTasks(prev => [...prev, newRecord as Task]);
                if (table === 'credentials') setAllCredentials(prev => [...prev, newRecord as Credential]);
            } else if (payload.eventType === 'UPDATE') {
                const { table, new: newRecord } = payload;
                if (table === 'projects') setAllProjects(prev => prev.map(p => p.id === newRecord.id ? newRecord as Project : p));
                if (table === 'transactions') setAllTransactions(prev => prev.map(t => t.id === newRecord.id ? newRecord as Transaction : t));
                if (table === 'debts') setAllDebts(prev => prev.map(d => d.id === newRecord.id ? newRecord as Debt : d));
                if (table === 'bank_accounts') setAllBankAccounts(prev => prev.map(b => b.id === newRecord.id ? newRecord as BankAccount : b));
                if (table === 'clients') setAllClients(prev => prev.map(c => c.id === newRecord.id ? newRecord as Client : c));
                if (table === 'categories') setAllCategories(prev => prev.map(c => c.id === newRecord.id ? newRecord as Category : c));
                if (table === 'tasks') setAllTasks(prev => prev.map(t => t.id === newRecord.id ? newRecord as Task : t));
                if (table === 'credentials') setAllCredentials(prev => prev.map(c => c.id === newRecord.id ? newRecord as Credential : c));
            } else if (payload.eventType === 'DELETE') {
                const { table, old: oldRecord } = payload;
                if (table === 'projects') setAllProjects(prev => prev.filter(p => p.id !== oldRecord.id));
                if (table === 'transactions') setAllTransactions(prev => prev.filter(t => t.id !== oldRecord.id));
                if (table === 'debts') setAllDebts(prev => prev.filter(d => d.id !== oldRecord.id));
                if (table === 'bank_accounts') setAllBankAccounts(prev => prev.filter(b => b.id !== oldRecord.id));
                if (table === 'clients') setAllClients(prev => prev.filter(c => c.id !== oldRecord.id));
                if (table === 'categories') setAllCategories(prev => prev.filter(c => c.id !== oldRecord.id));
                if (table === 'tasks') setAllTasks(prev => prev.filter(t => t.id !== oldRecord.id));
                if (table === 'credentials') setAllCredentials(prev => prev.filter(c => c.id !== oldRecord.id));
            }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(changes);
      };
    } else if (!isUserLoading) {
      setIsLoading(false);
    }
  }, [user, isUserLoading, fetchData]);

  useEffect(() => { if (currencyKey) localStorage.setItem(currencyKey, currency); }, [currency, currencyKey]);

  const setActiveProject = useCallback((project: Project | null) => {
    const projectToSet = project === null || project.id === 'all' ? ALL_BUSINESS_PROJECT : project;
    _setActiveProject(projectToSet);
    if (activeProjectKey) {
      localStorage.setItem(activeProjectKey, JSON.stringify(projectToSet));
    }
  }, [activeProjectKey]);
  
  const setDefaultProject = useCallback((project: Project | null) => {
    const projectToSet = project === null || project.id === 'all' ? ALL_BUSINESS_PROJECT : project;
    _setDefaultProject(projectToSet);
    if (defaultProjectKey) {
      localStorage.setItem(defaultProjectKey, JSON.stringify(projectToSet));
    }
  }, [defaultProjectKey]);

  const addProject = async (projectData: Omit<Project, 'id' | 'userId' | 'createdAt'>): Promise<Project> => {
    if (!user) throw new Error("User not authenticated");
    const { data: newProject, error } = await supabase.from('projects').insert({ ...projectData, userId: user.id }).select().single();
    if (error) throw error;
    return newProject;
  };

  const updateProject = async (projectId: string, projectData: Partial<Omit<Project, 'id' | 'userId' | 'createdAt'>>) => {
    const { error } = await supabase.from('projects').update(projectData).eq('id', projectId);
    if (error) throw error;
  };

  const deleteProject = async (projectId: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) throw error;
    if (activeProject?.id === projectId) setActiveProject(ALL_BUSINESS_PROJECT);
  };

  const addClient = async (clientData: Omit<Client, 'id' | 'userId' | 'projectId'>, projectId?: string): Promise<Client> => {
    if (!user) throw new Error("User not authenticated");
    const finalProjectId = projectId || (activeProject && activeProject.id !== 'all' ? activeProject.id : undefined);
    const { data: newClient, error } = await supabase.from('clients').insert({ ...clientData, userId: user.id, projectId: finalProjectId }).select().single();
    if (error) throw error;
    return newClient;
  };

  const updateClient = async (clientId: string, clientData: Partial<Omit<Client, 'id' | 'userId'>>) => {
    const { error } = await supabase.from('clients').update(clientData).eq('id', clientId);
    if (error) throw error;
  };

  const deleteClient = async (clientId: string) => {
    const { error } = await supabase.from('clients').delete().eq('id', clientId);
    if (error) throw error;
  };

  const addCategory = async (categoryData: Omit<Category, 'id' | 'userId'>, projectId?: string) => {
    if (!user) return;
    const finalProjectId = projectId || (activeProject && activeProject.id !== 'all' ? activeProject.id : undefined);
    const { error } = await supabase.from('categories').insert({ ...categoryData, userId: user.id, projectId: finalProjectId });
    if (error) throw error;
  };

  const updateCategory = async (categoryId: string, categoryData: Partial<Omit<Category, 'id' | 'userId'>>) => {
    const { error } = await supabase.from('categories').update(categoryData).eq('id', categoryId);
    if (error) throw error;
  };
  
  const deleteCategory = async (categoryId: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', categoryId);
    if (error) throw error;
  };

  const updateAccountBalance = useCallback(async (accountId: string, amount: number, operation: 'add' | 'subtract') => {
      const { data: account, error: fetchError } = await supabase.from('bank_accounts').select('balance').eq('id', accountId).single();
      if (fetchError || !account) {
        console.error("Error fetching account for balance update:", fetchError);
        return;
      }
      const newBalance = operation === 'add' ? account.balance + amount : account.balance - amount;
      const { error } = await supabase.from('bank_accounts').update({ balance: newBalance }).eq('id', accountId);
      if (error) console.error("Error updating balance:", error);
  }, []);

  const addTransaction = async (transactionData: Omit<Transaction, 'id'| 'date' | 'userId'>, returnRef = false): Promise<{ id: string } | void> => {
    if (!user) throw new Error("User not authenticated");
    const { data: newTransaction, error } = await supabase.from('transactions').insert({ ...transactionData, userId: user.id, date: new Date().toISOString() }).select().single();
    if (error) throw error;
    
    if (newTransaction.type === 'income' && newTransaction.accountId) { await updateAccountBalance(newTransaction.accountId, newTransaction.amount, 'add'); } 
    else if (newTransaction.type === 'expense' && newTransaction.accountId) { await updateAccountBalance(newTransaction.accountId, newTransaction.amount, 'subtract'); } 
    else if (newTransaction.type === 'transfer' && newTransaction.fromAccountId && newTransaction.toAccountId) {
        await updateAccountBalance(newTransaction.fromAccountId, newTransaction.amount, 'subtract');
        await updateAccountBalance(newTransaction.toAccountId, newTransaction.amount, 'add');
    }
    if (returnRef) { return { id: newTransaction.id }; }
  };

  const updateTransaction = async (originalTransaction: Transaction, updatedData: Partial<Transaction>) => {
    if (originalTransaction.accountId) {
      if (originalTransaction.type === 'income') await updateAccountBalance(originalTransaction.accountId, originalTransaction.amount, 'subtract');
      if (originalTransaction.type === 'expense') await updateAccountBalance(originalTransaction.accountId, originalTransaction.amount, 'add');
    }
    const { error } = await supabase.from('transactions').update(updatedData).eq('id', originalTransaction.id);
    if (error) throw error;

    const finalTransaction = { ...originalTransaction, ...updatedData };
    if (finalTransaction.accountId) {
        if (finalTransaction.type === 'income') await updateAccountBalance(finalTransaction.accountId, finalTransaction.amount, 'add');
        if (finalTransaction.type === 'expense') await updateAccountBalance(finalTransaction.accountId, finalTransaction.amount, 'subtract');
    }
  };

  const deleteTransaction = async (transactionToDelete: Transaction) => {
    if (transactionToDelete.accountId) {
        if (transactionToDelete.type === 'income') { await updateAccountBalance(transactionToDelete.accountId, transactionToDelete.amount, 'subtract'); } 
        else if (transactionToDelete.type === 'expense') { await updateAccountBalance(transactionToDelete.accountId, transactionToDelete.amount, 'add'); }
    }
    const { error } = await supabase.from('transactions').delete().eq('id', transactionToDelete.id);
    if (error) throw error;
  };

  const addDebt = async (debtData: Omit<Debt, 'id' | 'date' | 'userId' >, returnRef = false): Promise<{ id: string } | void> => {
    if (!user || !debtData.accountId) throw new Error("User not authenticated");

    const { data: newDebt, error } = await supabase.from('debts').insert({ ...debtData, userId: user.id, date: new Date().toISOString() }).select().single();
    if (error) throw error;

    if (newDebt.type === 'creditor') { await updateAccountBalance(newDebt.accountId, newDebt.amount, 'add'); } 
    else if (newDebt.type === 'debtor') { await updateAccountBalance(newDebt.accountId, newDebt.amount, 'subtract'); }
    if (returnRef) { return { id: newDebt.id }; }
  };

  const updateDebt = async (originalDebt: Debt, updatedData: Partial<Debt>) => {
    const amountDifference = (updatedData.amount ?? originalDebt.amount) - originalDebt.amount;
    if (amountDifference !== 0 && originalDebt.accountId) {
        if (originalDebt.type === 'creditor') { await updateAccountBalance(originalDebt.accountId, amountDifference, 'add'); } 
        else { await updateAccountBalance(originalDebt.accountId, amountDifference, 'subtract'); }
    }
    const { error } = await supabase.from('debts').update(updatedData).eq('id', originalDebt.id);
    if (error) throw error;
  };

  const deleteDebt = async (debtToDelete: Debt) => {
    if (debtToDelete.accountId) {
        if (debtToDelete.type === 'creditor') { await updateAccountBalance(debtToDelete.accountId, debtToDelete.amount, 'subtract'); } 
        else { await updateAccountBalance(debtToDelete.accountId, debtToDelete.amount, 'add'); }
    }
    const { error } = await supabase.from('debts').delete().eq('id', debtToDelete.id);
    if (error) throw error;
  };

  const addRepayment = async (debt: Debt, amount: number, accountId: string) => {
    await updateDebt(debt, { amount: debt.amount - amount });
    await addTransaction({ type: 'repayment', amount, category: 'Debt Repayment', description: `Payment for debt: ${debt.name}`, debtId: debt.id, accountId: accountId, projectId: debt.projectId });
  };

  const addBankAccount = async (account: Omit<BankAccount, 'id' | 'userId'>) => {
    if (!user) return;
    const { error } = await supabase.from('bank_accounts').insert({ ...account, userId: user.id, isPrimary: allBankAccounts.length === 0 });
    if (error) throw error;
  };

  const updateBankAccount = async (accountId: string, accountData: Partial<Omit<BankAccount, 'id' | 'userId'>>) => {
    const { error } = await supabase.from('bank_accounts').update(accountData).eq('id', accountId);
    if (error) throw error;
  };

  const deleteBankAccount = async (accountId: string) => {
    const { error } = await supabase.from('bank_accounts').delete().eq('id', accountId);
    if (error) throw error;
  };

  const setCurrency = useCallback((newCurrency: string) => { setCurrencyState(newCurrency); }, []);

  const setPrimaryBankAccount = async (accountId: string) => {
    if (!user) return;
    const updates = allBankAccounts.map(acc => 
      supabase.from('bank_accounts').update({ isPrimary: acc.id === accountId }).eq('id', acc.id)
    );
    await Promise.all(updates);
  };

  const getTransactionById = useCallback((id: string) => allTransactions.find(t => t.id === id), [allTransactions]);
  const getDebtById = useCallback((id: string) => allDebts.find(d => d.id === id), [allDebts]);

  const addTask = async (taskData: Omit<Task, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;
    const { error } = await supabase.from('tasks').insert({ ...taskData, userId: user.id, createdAt: new Date().toISOString() });
    if (error) throw error;
  };

  const updateTask = async (taskId: string, taskData: Partial<Omit<Task, 'id' | 'userId' | 'createdAt'>>) => {
    const { error } = await supabase.from('tasks').update(taskData).eq('id', taskId);
    if (error) throw error;
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) throw error;
  };

  const addCredential = async (credentialData: Omit<Credential, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;
    const { projectId, ...restData } = credentialData;
    const finalData = { ...restData, projectId: projectId === 'personal' ? undefined : projectId };
    const { error } = await supabase.from('credentials').insert({ ...finalData, userId: user.id, createdAt: new Date().toISOString() });
    if (error) throw error;
  };

  const updateCredential = async (credentialId: string, credentialData: Partial<Omit<Credential, 'id' | 'userId' | 'createdAt'>>) => {
    const { projectId, ...restData } = credentialData;
    const finalData = { ...restData, projectId: projectId === 'personal' ? undefined : projectId };
    const { error } = await supabase.from('credentials').update(finalData).eq('id', credentialId);
    if (error) throw error;
  };
  
  const deleteCredential = async (credentialId: string) => {
    const { error } = await supabase.from('credentials').delete().eq('id', credentialId);
    if (error) throw error;
  };
  
  const filteredTransactions = useMemo(() => (activeProject && activeProject.id !== 'all') ? allTransactions.filter(t => t.projectId === activeProject.id) : allTransactions.filter(t => !t.projectId), [allTransactions, activeProject]);
  const filteredDebts = useMemo(() => (activeProject && activeProject.id !== 'all') ? allDebts.filter(d => d.projectId === activeProject.id) : allDebts.filter(d => !d.projectId), [allDebts, activeProject]);
  const filteredClients = useMemo(() => (activeProject && activeProject.id !== 'all') ? allClients.filter(c => c.projectId === activeProject.id) : allClients.filter(c => !c.projectId), [allClients, activeProject]);
  const filteredCategories = useMemo(() => (activeProject && activeProject.id !== 'all') ? allCategories.filter(c => c.projectId === activeProject.id) : allCategories.filter(c => !c.projectId), [allCategories, activeProject]);
  const filteredTasks = useMemo(() => (activeProject && activeProject.id !== 'all') ? allTasks.filter(t => t.projectId === activeProject.id) : allTasks.filter(t => !t.projectId), [allTasks, activeProject]);
  const filteredCredentials = useMemo(() => (activeProject && activeProject.id !== 'all') ? allCredentials.filter(c => c.projectId === activeProject.id) : allCredentials.filter(c => !c.projectId), [allCredentials, activeProject]);


  const contextValue = useMemo(() => ({
    projects: allProjects, activeProject, setActiveProject, defaultProject, setDefaultProject, addProject, updateProject, deleteProject,
    transactions: filteredTransactions, allTransactions: allTransactions, addTransaction, updateTransaction, deleteTransaction, getTransactionById,
    debts: filteredDebts, addDebt, updateDebt, deleteDebt, addRepayment, getDebtById,
    bankAccounts: allBankAccounts, addBankAccount, updateBankAccount, deleteBankAccount, setPrimaryBankAccount,
    clients: filteredClients, addClient, updateClient, deleteClient,
    categories: filteredCategories, addCategory, updateCategory, deleteCategory,
    tasks: filteredTasks, addTask, updateTask, deleteTask,
    credentials: filteredCredentials, addCredential, updateCredential, deleteCredential,
    currency, setCurrency,
    isLoading: isLoading || isUserLoading,
  }), [
      allProjects, activeProject, setActiveProject, defaultProject, setDefaultProject, addProject, updateProject, deleteProject,
      filteredTransactions, allTransactions, addTransaction, updateTransaction, deleteTransaction, getTransactionById,
      filteredDebts, addDebt, updateDebt, deleteDebt, addRepayment, getDebtById,
      allBankAccounts, addBankAccount, updateBankAccount, deleteBankAccount, setPrimaryBankAccount,
      filteredClients, addClient, updateClient, deleteClient,
      filteredCategories, addCategory, updateCategory, deleteCategory,
      filteredTasks, addTask, updateTask, deleteTask,
      filteredCredentials, addCredential, updateCredential, deleteCredential,
      currency, setCurrency,
      isLoading, isUserLoading,
      updateAccountBalance
    ]);

  return (
    <FinancialContext.Provider value={contextValue}>
      {children}
    </FinancialContext.Provider>
  );
}
