'use client';

import { createContext, useCallback, ReactNode, useMemo, useState, useEffect } from 'react';
import type { Transaction, Debt, BankAccount, Project, Client, Category, Task, Credential } from '@/lib/types';
import { supabase } from '@/lib/supabase_client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './AuthContext';

interface FinancialContextType {
  projects: Project[];
  activeProject: Project | null;
  setActiveProject: (project: Project | null) => void;
  defaultProject: Project | null;
  setDefaultProject: (project: Project | null) => void;
  addProject: (projectData: Omit<Project, 'id' | 'user_id' | 'created_at'>) => Promise<Project>;
  updateProject: (projectId: string, projectData: Partial<Omit<Project, 'id' | 'user_id' | 'created_at'>>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  
  transactions: Transaction[];
  allTransactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'date' | 'user_id'>, returnRef?: boolean) => Promise<{ id: string } | void>;
  updateTransaction: (originalTransaction: Transaction, updatedData: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (transaction: Transaction) => Promise<void>;
  getTransactionById: (id: string) => Transaction | undefined;
  
  debts: Debt[];
  allDebts: Debt[];
  addDebt: (debt: Omit<Debt, 'id' | 'date' | 'user_id' | 'name'>, returnRef?: boolean) => Promise<{ id: string } | void>;
  updateDebt: (originalDebt: Debt, updatedData: Partial<Debt>) => Promise<void>;
  deleteDebt: (debt: Debt) => Promise<void>;
  addRepayment: (debt: Debt, amount: number, account_id: string) => Promise<void>;
  getDebtById: (id: string) => Debt | undefined;

  bankAccounts: BankAccount[];
  addBankAccount: (account: Omit<BankAccount, 'id' | 'user_id'>) => Promise<void>;
  updateBankAccount: (accountId: string, accountData: Partial<Omit<BankAccount, 'id' | 'user_id'>>) => Promise<void>;
  deleteBankAccount: (accountId: string) => Promise<void>;
  setPrimaryBankAccount: (accountId: string) => Promise<void>;
  
  clients: Client[];
  addClient: (clientData: Omit<Client, 'id' | 'user_id' | 'project_id'>, project_id?: string) => Promise<Client>;
  updateClient: (clientId: string, clientData: Partial<Omit<Client, 'id' | 'user_id'>>) => Promise<void>;
  deleteClient: (clientId: string) => Promise<void>;

  categories: Category[];
  addCategory: (categoryData: Omit<Category, 'id' | 'user_id' | 'project_id'>, project_id?: string) => Promise<Category>;
  updateCategory: (categoryId: string, categoryData: Partial<Omit<Category, 'id' | 'user_id'>>) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  
  tasks: Task[];
  addTask: (taskData: Omit<Task, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  updateTask: (taskId: string, taskData: Partial<Omit<Task, 'id' | 'user_id' | 'created_at'>>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  
  credentials: Credential[];
  addCredential: (credentialData: Omit<Credential, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  updateCredential: (credentialId: string, credentialData: Partial<Omit<Credential, 'id' | 'user_id' | 'created_at'>>) => Promise<void>;
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

const ALL_BUSINESS_PROJECT: Project = { id: 'all', name: 'All Business', user_id: '', created_at: new Date().toISOString() };

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
        projectsRes,
        transactionsRes,
        debtsRes,
        bankAccountsRes,
        clientsRes,
        categoriesRes,
        tasksRes,
        credentialsRes,
        userSettingsRes
      ] = await Promise.all([
        supabase.from('projects').select('*').eq('user_id', userId),
        supabase.from('transactions').select('*').eq('user_id', userId),
        supabase.from('debts').select('*').eq('user_id', userId),
        supabase.from('bank_accounts').select('*').eq('user_id', userId),
        supabase.from('clients').select('*').eq('user_id', userId),
        supabase.from('categories').select('*').eq('user_id', userId),
        supabase.from('tasks').select('*').eq('user_id', userId),
        supabase.from('credentials').select('*').eq('user_id', userId),
        supabase.from('user_settings').select('*').eq('user_id', userId).single(),
      ]);

      const projects = projectsRes.data || [];
      const clients = clientsRes.data || [];
      const debts = (debtsRes.data || []).map(d => ({ ...d, name: clients.find(c => c.id === d.client_id)?.name || 'Unknown Client' }));
      
      setAllProjects(projects);
      setAllTransactions(transactionsRes.data || []);
      setAllDebts(debts);
      setAllBankAccounts(bankAccountsRes.data || []);
      setAllClients(clients);
      setAllCategories(categoriesRes.data || []);
      setAllTasks(tasksRes.data || []);
      setAllCredentials(credentialsRes.data || []);

      if (!bankAccountsRes.data || bankAccountsRes.data.length === 0) {
        const { data: newAccount } = await supabase.from('bank_accounts').insert({ user_id: userId, name: 'Primary Account', balance: 0, is_primary: true }).select().single();
        if (newAccount) setAllBankAccounts([newAccount]);
      }
      
      const currencyToSet = userSettingsRes.data?.currency || 'INR';
      setCurrencyState(currencyToSet);
      if (currencyKey) localStorage.setItem(currencyKey, currencyToSet);

      const storedDefaultProject = defaultProjectKey ? JSON.parse(localStorage.getItem(defaultProjectKey) || 'null') : null;
      let activeProjectToSet: Project | null = storedDefaultProject;
      const storedActiveProject = activeProjectKey ? JSON.parse(localStorage.getItem(activeProjectKey) || 'null') : null;
      if (storedActiveProject) activeProjectToSet = storedActiveProject;
      
      if (activeProjectToSet && (activeProjectToSet.id === 'all' || projects.some(p => p.id === activeProjectToSet!.id))) {
        _setActiveProject(activeProjectToSet);
      } else {
        _setActiveProject(ALL_BUSINESS_PROJECT);
      }
       if (storedDefaultProject && (storedDefaultProject.id === 'all' || projects.some(p => p.id === storedDefaultProject.id))) {
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
    } else if (!isUserLoading) {
      setIsLoading(false);
    }
  }, [user, isUserLoading, fetchData]);
  
  useEffect(() => {
    if (!user) return;
    
    const handleInserts = (payload: any) => {
        const { table, new: newRecord } = payload;
        switch (table) {
            case 'projects': setAllProjects(prev => [...prev, newRecord]); break;
            case 'transactions': setAllTransactions(prev => [...prev, newRecord]); break;
            case 'debts': 
                const debtName = allClients.find(c => c.id === newRecord.client_id)?.name || 'Unknown Client'
                setAllDebts(prev => [...prev, {...newRecord, name: debtName}]); 
                break;
            case 'bank_accounts': setAllBankAccounts(prev => [...prev, newRecord]); break;
            case 'clients': setAllClients(prev => [...prev, newRecord]); break;
            case 'categories': setAllCategories(prev => [...prev, newRecord]); break;
            case 'tasks': setAllTasks(prev => [...prev, newRecord]); break;
            case 'credentials': setAllCredentials(prev => [...prev, newRecord]); break;
        }
    };
    const handleUpdates = (payload: any) => {
        const { table, new: newRecord } = payload;
        switch (table) {
            case 'projects': setAllProjects(prev => prev.map(p => p.id === newRecord.id ? newRecord : p)); break;
            case 'transactions': setAllTransactions(prev => prev.map(t => t.id === newRecord.id ? newRecord : t)); break;
            case 'debts': 
                const debtName = allClients.find(c => c.id === newRecord.client_id)?.name || 'Unknown Client';
                setAllDebts(prev => prev.map(d => d.id === newRecord.id ? {...newRecord, name: debtName} : d));
                break;
            case 'bank_accounts': setAllBankAccounts(prev => prev.map(b => b.id === newRecord.id ? newRecord : b)); break;
            case 'clients': 
                setAllClients(prev => prev.map(c => c.id === newRecord.id ? newRecord : c));
                setAllDebts(prev => prev.map(d => d.client_id === newRecord.id ? { ...d, name: newRecord.name } : d));
                break;
            case 'categories': setAllCategories(prev => prev.map(c => c.id === newRecord.id ? newRecord : c)); break;
            case 'tasks': setAllTasks(prev => prev.map(t => t.id === newRecord.id ? newRecord : t)); break;
            case 'credentials': setAllCredentials(prev => prev.map(c => c.id === newRecord.id ? newRecord : c)); break;
        }
    };
    const handleDeletes = (payload: any) => {
        const { table, old: oldRecord } = payload;
        switch (table) {
            case 'projects': setAllProjects(prev => prev.filter(p => p.id !== oldRecord.id)); break;
            case 'transactions': setAllTransactions(prev => prev.filter(t => t.id !== oldRecord.id)); break;
            case 'debts': setAllDebts(prev => prev.filter(d => d.id !== oldRecord.id)); break;
            case 'bank_accounts': setAllBankAccounts(prev => prev.filter(b => b.id !== oldRecord.id)); break;
            case 'clients': setAllClients(prev => prev.filter(c => c.id !== oldRecord.id)); break;
            case 'categories': setAllCategories(prev => prev.filter(c => c.id !== oldRecord.id)); break;
            case 'tasks': setAllTasks(prev => prev.filter(t => t.id !== oldRecord.id)); break;
            case 'credentials': setAllCredentials(prev => prev.filter(c => c.id !== oldRecord.id)); break;
        }
    };

    const changes = supabase.channel('financial-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public' }, handleInserts)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public' }, handleUpdates)
      .on('postgres_changes', { event: 'DELETE', schema: 'public' }, handleDeletes)
      .subscribe();

    return () => {
      supabase.removeChannel(changes);
    };
  }, [user, allClients]);


  useEffect(() => { 
      if (currencyKey) {
          localStorage.setItem(currencyKey, currency);
          if (user) {
              supabase.from('user_settings').upsert({ user_id: user.id, currency }).then();
          }
      }
  }, [currency, currencyKey, user]);

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

  const addProject = async (projectData: Omit<Project, 'id' | 'user_id' | 'created_at'>): Promise<Project> => {
    if (!user) throw new Error("User not authenticated");
    const dbProject = { 
        ...projectData,
        user_id: user.id, 
        created_at: new Date().toISOString()
    };
    const { data: newProject, error } = await supabase.from('projects').insert(dbProject).select().single();
    if (error) throw error;
    return newProject;
  };

  const updateProject = async (projectId: string, projectData: Partial<Omit<Project, 'id' | 'user_id' | 'created_at'>>) => {
    const { error } = await supabase.from('projects').update(projectData).eq('id', projectId);
    if (error) throw error;
  };

  const deleteProject = async (projectId: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) throw error;
    if (activeProject?.id === projectId) setActiveProject(ALL_BUSINESS_PROJECT);
  };

  const addClient = async (clientData: Omit<Client, 'id' | 'user_id' | 'project_id'>, project_id?: string): Promise<Client> => {
    if (!user) throw new Error("User not authenticated");
    const finalProjectId = (project_id && project_id !== 'all') ? project_id : undefined;
    const { data: newClient, error } = await supabase.from('clients').insert({ ...clientData, project_id: finalProjectId, user_id: user.id }).select().single();
    if (error) throw error;
    return newClient;
  };

  const updateClient = async (clientId: string, clientData: Partial<Omit<Client, 'id' | 'user_id'>>) => {
    const { error } = await supabase.from('clients').update(clientData).eq('id', clientId);
    if (error) throw error;
  };

  const deleteClient = async (clientId: string) => {
    const { error } = await supabase.from('clients').delete().eq('id', clientId);
    if (error) throw error;
  };

  const addCategory = async (categoryData: Omit<Category, 'id' | 'user_id' | 'project_id'>, project_id?: string): Promise<Category> => {
    if (!user) throw new Error("User not authenticated");
    const finalProjectId = (project_id && project_id !== 'all') ? project_id : undefined;
    const { data: newCategory, error } = await supabase.from('categories').insert({ ...categoryData, project_id: finalProjectId, user_id: user.id }).select().single();
    if (error) throw error;
    return newCategory;
  };

  const updateCategory = async (categoryId: string, categoryData: Partial<Omit<Category, 'id' | 'user_id'>>) => {
    const { error } = await supabase.from('categories').update(categoryData).eq('id', categoryId);
    if (error) throw error;
  };
  
  const deleteCategory = async (categoryId: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', categoryId);
    if (error) throw error;
  };

  const updateAccountBalance = useCallback(async (account_id: string, amount: number, operation: 'add' | 'subtract') => {
      const { data: account, error: fetchError } = await supabase.from('bank_accounts').select('balance').eq('id', account_id).single();
      if (fetchError || !account) {
        console.error("Error fetching account for balance update:", fetchError);
        return;
      }
      const newBalance = operation === 'add' ? account.balance + amount : account.balance - amount;
      const { error } = await supabase.from('bank_accounts').update({ balance: newBalance }).eq('id', account_id);
      if (error) console.error("Error updating balance:", error);
  }, []);

  const addTransaction = async (transactionData: Omit<Transaction, 'id'| 'date' | 'user_id'>, returnRef = false): Promise<{ id: string } | void> => {
    if (!user) throw new Error("User not authenticated");
    const dbTransaction: Omit<Transaction, 'id'> & { user_id: string; date: string; } = {
        ...transactionData,
        user_id: user.id,
        date: new Date().toISOString(),
    };
    
    const { data: newTransaction, error } = await supabase.from('transactions').insert(dbTransaction).select().single();
    if (error) throw error;
    
    if (newTransaction.type === 'income' && newTransaction.account_id) { await updateAccountBalance(newTransaction.account_id, newTransaction.amount, 'add'); } 
    else if (newTransaction.type === 'expense' && newTransaction.account_id) { await updateAccountBalance(newTransaction.account_id, newTransaction.amount, 'subtract'); } 
    else if (newTransaction.type === 'transfer' && newTransaction.from_account_id && newTransaction.to_account_id) {
        await updateAccountBalance(newTransaction.from_account_id, newTransaction.amount, 'subtract');
        await updateAccountBalance(newTransaction.to_account_id, newTransaction.amount, 'add');
    }
    if (returnRef) { return { id: newTransaction.id }; }
  };

  const updateTransaction = async (originalTransaction: Transaction, updatedData: Partial<Transaction>) => {
    if (originalTransaction.account_id) {
      if (originalTransaction.type === 'income') await updateAccountBalance(originalTransaction.account_id, originalTransaction.amount, 'subtract');
      if (originalTransaction.type === 'expense') await updateAccountBalance(originalTransaction.account_id, originalTransaction.amount, 'add');
    }
    const { error } = await supabase.from('transactions').update(updatedData).eq('id', originalTransaction.id);
    if (error) throw error;

    const finalTransaction = { ...originalTransaction, ...updatedData };
    if (finalTransaction.account_id) {
        if (finalTransaction.type === 'income') await updateAccountBalance(finalTransaction.account_id, finalTransaction.amount, 'add');
        if (finalTransaction.type === 'expense') await updateAccountBalance(finalTransaction.account_id, finalTransaction.amount, 'subtract');
    }
  };

  const deleteTransaction = async (transactionToDelete: Transaction) => {
    if (transactionToDelete.account_id) {
        if (transactionToDelete.type === 'income') { await updateAccountBalance(transactionToDelete.account_id, transactionToDelete.amount, 'subtract'); } 
        else if (transactionToDelete.type === 'expense') { await updateAccountBalance(transactionToDelete.account_id, transactionToDelete.amount, 'add'); }
    }
    const { error } = await supabase.from('transactions').delete().eq('id', transactionToDelete.id);
    if (error) throw error;
  };

  const addDebt = async (debtData: Omit<Debt, 'id' | 'date' | 'user_id' | 'name'>, returnRef = false): Promise<{ id: string } | void> => {
    if (!user || !debtData.account_id) throw new Error("User not authenticated or missing account_id");
    
    const dbDebt: Omit<Debt, 'id'|'date'|'user_id'|'name'> & {user_id: string; date: string} = {
        ...debtData,
        user_id: user.id,
        date: new Date().toISOString(),
    };
    
    const { data: newDebt, error } = await supabase.from('debts').insert(dbDebt).select().single();
    if (error) throw error;

    if (newDebt.type === 'creditor') { await updateAccountBalance(newDebt.account_id, newDebt.amount, 'add'); } 
    else if (newDebt.type === 'debtor') { await updateAccountBalance(newDebt.account_id, newDebt.amount, 'subtract'); }
    if (returnRef) { return { id: newDebt.id }; }
  };

  const updateDebt = async (originalDebt: Debt, updatedData: Partial<Debt>) => {
    const amountDifference = (updatedData.amount ?? originalDebt.amount) - originalDebt.amount;
    if (amountDifference !== 0 && originalDebt.account_id) {
        if (originalDebt.type === 'creditor') { await updateAccountBalance(originalDebt.account_id, amountDifference, 'add'); } 
        else { await updateAccountBalance(originalDebt.account_id, amountDifference, 'subtract'); }
    }
    const { error } = await supabase.from('debts').update(updatedData).eq('id', originalDebt.id);
    if (error) throw error;
  };

  const deleteDebt = async (debtToDelete: Debt) => {
    if (debtToDelete.account_id) {
        if (debtToDelete.type === 'creditor') { await updateAccountBalance(debtToDelete.account_id, debtToDelete.amount, 'subtract'); } 
        else { await updateAccountBalance(debtToDelete.account_id, debtToDelete.amount, 'add'); }
    }
    const { error } = await supabase.from('debts').delete().eq('id', debtToDelete.id);
    if (error) throw error;
  };

  const addRepayment = async (debt: Debt, amount: number, account_id: string) => {
    await updateDebt(debt, { amount: debt.amount - amount });
    await addTransaction({ type: 'repayment', amount, category: 'Debt Repayment', description: `Payment for debt: ${debt.name}`, debt_id: debt.id, account_id: account_id, project_id: debt.project_id });
  };

  const addBankAccount = async (account: Omit<BankAccount, 'id' | 'user_id'>) => {
    if (!user) return;
    const { error } = await supabase.from('bank_accounts').insert({ ...account, user_id: user.id, is_primary: allBankAccounts.length === 0 });
    if (error) throw error;
  };

  const updateBankAccount = async (accountId: string, accountData: Partial<Omit<BankAccount, 'id' | 'user_id'>>) => {
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
      supabase.from('bank_accounts').update({ is_primary: acc.id === accountId }).eq('id', acc.id)
    );
    await Promise.all(updates);
  };

  const getTransactionById = useCallback((id: string) => allTransactions.find(t => t.id === id), [allTransactions]);
  const getDebtById = useCallback((id: string) => allDebts.find(d => d.id === id), [allDebts]);

  const addTask = async (taskData: Omit<Task, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return;
    await supabase.from('tasks').insert({ ...taskData, user_id: user.id, created_at: new Date().toISOString() });
  };

  const updateTask = async (taskId: string, taskData: Partial<Omit<Task, 'id' | 'user_id'>>) => {
    await supabase.from('tasks').update(taskData).eq('id', taskId);
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) throw error;
  };

  const addCredential = async (credentialData: Omit<Credential, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return;
    const dbData = {
      ...credentialData,
      user_id: user.id,
      created_at: new Date().toISOString()
    };
    await supabase.from('credentials').insert(dbData);
  };

  const updateCredential = async (credentialId: string, credentialData: Partial<Omit<Credential, 'id' | 'user_id'>>) => {
    await supabase.from('credentials').update(credentialData).eq('id', credentialId);
  };
  
  const deleteCredential = async (credentialId: string) => {
    const { error } = await supabase.from('credentials').delete().eq('id', credentialId);
    if (error) throw error;
  };
  
  const filteredTransactions = useMemo(() => (activeProject && activeProject.id !== 'all') ? allTransactions.filter(t => t.project_id === activeProject.id) : allTransactions.filter(t => !t.project_id), [allTransactions, activeProject]);
  const filteredDebts = useMemo(() => {
    if (activeProject && activeProject.id !== 'all') {
      return allDebts.filter(d => d.project_id === activeProject.id);
    }
    return allDebts.filter(d => !d.project_id);
  }, [allDebts, activeProject]);
  
  const filteredClients = useMemo(() => {
      if (activeProject && activeProject.id !== 'all') {
        return allClients.filter(c => c.project_id === activeProject.id);
      }
      return allClients.filter(c => !c.project_id);
  }, [allClients, activeProject]);

  const filteredCategories = useMemo(() => {
      if (activeProject && activeProject.id !== 'all') {
          return allCategories.filter(c => c.project_id === activeProject.id);
      }
      return allCategories.filter(c => !c.project_id);
  }, [allCategories, activeProject]);

  const filteredTasks = useMemo(() => (activeProject && activeProject.id !== 'all') ? allTasks.filter(t => t.project_id === activeProject.id) : allTasks.filter(t => !t.project_id), [allTasks, activeProject]);
  const filteredCredentials = useMemo(() => (activeProject && activeProject.id !== 'all') ? allCredentials.filter(c => c.project_id === activeProject.id) : allCredentials.filter(c => !c.project_id), [allCredentials, activeProject]);


  const contextValue: FinancialContextType = useMemo(() => ({
    projects: allProjects, activeProject, setActiveProject, defaultProject, setDefaultProject, addProject, updateProject, deleteProject,
    transactions: filteredTransactions, allTransactions, addTransaction, updateTransaction, deleteTransaction, getTransactionById,
    debts: filteredDebts, allDebts, addDebt, updateDebt, deleteDebt, addRepayment, getDebtById,
    bankAccounts: allBankAccounts, addBankAccount, updateBankAccount, deleteBankAccount, setPrimaryBankAccount,
    clients: filteredClients, addClient, updateClient, deleteClient,
    categories: filteredCategories, addCategory, updateCategory, deleteCategory,
    tasks: filteredTasks, addTask, updateTask, deleteTask,
    credentials: filteredCredentials, addCredential, updateCredential, deleteCredential,
    currency, setCurrency,
    isLoading: isLoading || isUserLoading,
  }), [
      allProjects, activeProject, setActiveProject, defaultProject, setDefaultProject,
      filteredTransactions, allTransactions, getTransactionById,
      filteredDebts, allDebts, getDebtById,
      allBankAccounts,
      filteredClients,
      filteredCategories,
      filteredTasks,
      filteredCredentials,
      currency, setCurrency,
      isLoading, isUserLoading,
      updateAccountBalance,
      addTransaction, updateTransaction, deleteTransaction,
      addDebt, updateDebt, deleteDebt, addRepayment,
      addBankAccount, updateBankAccount, deleteBankAccount, setPrimaryBankAccount,
      addClient, updateClient, deleteClient,
      addCategory, updateCategory, deleteCategory,
      addTask, updateTask, deleteTask,
      addCredential, updateCredential, deleteCredential,
      addProject, updateProject, deleteProject
    ]);

  return (
    <FinancialContext.Provider value={contextValue}>
      {children}
    </FinancialContext.Provider>
  );
}
