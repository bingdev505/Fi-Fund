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
  allBankAccounts: BankAccount[];
  addBankAccount: (account: Omit<BankAccount, 'id' | 'user_id' | 'is_primary'>, project_id?: string) => Promise<void>;
  updateBankAccount: (accountId: string, accountData: Partial<Omit<BankAccount, 'id' | 'user_id'>>) => Promise<void>;
  deleteBankAccount: (accountId: string) => Promise<void>;
  setPrimaryBankAccount: (accountId: string) => Promise<void>;
  linkBankAccount: (accountId: string, projectId: string) => Promise<void>;
  
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
const PERSONAL_PROJECT_NAME = "Personal";

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
      let [
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

      let projects = projectsRes.data || [];
      const hasPersonalProject = projects.some(p => p.name === PERSONAL_PROJECT_NAME);

      if (!hasPersonalProject) {
          const { data: newPersonalProject, error: personalProjectError } = await supabase.from('projects').insert({
              user_id: userId,
              name: PERSONAL_PROJECT_NAME,
              created_at: new Date().toISOString()
          }).select().single();
          
          if (personalProjectError) {
              throw personalProjectError;
          }
          if (newPersonalProject) {
            projects = [...projects, newPersonalProject];
          }
      }


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
        const personalProject = projects.find(p => p.name === PERSONAL_PROJECT_NAME);
        const { data: newAccount } = await supabase.from('bank_accounts').insert({ user_id: userId, name: 'Primary Account', balance: 0, is_primary: true, project_id: personalProject?.id }).select().single();
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
    setAllProjects(prev => [...prev, newProject]);
    return newProject;
  };

  const updateProject = async (projectId: string, projectData: Partial<Omit<Project, 'id' | 'user_id' | 'created_at'>>) => {
    const { data: updatedProject, error } = await supabase.from('projects').update(projectData).eq('id', projectId).select().single();
    if (error) throw error;
    setAllProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  const deleteProject = async (projectId: string) => {
    const projectToDelete = allProjects.find(p => p.id === projectId);
    if (projectToDelete?.name === PERSONAL_PROJECT_NAME) {
        toast({ variant: 'destructive', title: 'Cannot Delete Personal Project' });
        return;
    }
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) throw error;
    setAllProjects(prev => prev.filter(p => p.id !== projectId));
    if (activeProject?.id === projectId) setActiveProject(ALL_BUSINESS_PROJECT);
  };

  const addClient = async (clientData: Omit<Client, 'id' | 'user_id' | 'project_id'>, project_id?: string): Promise<Client> => {
    if (!user) throw new Error("User not authenticated");
    const personalProject = allProjects.find(p => p.name === PERSONAL_PROJECT_NAME);
    const finalProjectId = project_id === personalProject?.id ? project_id : (project_id && project_id !== 'all' ? project_id : personalProject?.id);

    const { data: newClient, error } = await supabase.from('clients').insert({ ...clientData, project_id: finalProjectId, user_id: user.id }).select().single();
    if (error) throw error;
    setAllClients(prev => [...prev, newClient]);
    return newClient;
  };

  const updateClient = async (clientId: string, clientData: Partial<Omit<Client, 'id' | 'user_id'>>) => {
    const { data: updatedClient, error } = await supabase.from('clients').update(clientData).eq('id', clientId).select().single();
    if (error) throw error;
    setAllClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
    setAllDebts(prev => prev.map(d => d.client_id === updatedClient.id ? { ...d, name: updatedClient.name } : d));
  };

  const deleteClient = async (clientId: string) => {
    const { error } = await supabase.from('clients').delete().eq('id', clientId);
    if (error) throw error;
    setAllClients(prev => prev.filter(c => c.id !== clientId));
  };

  const addCategory = async (categoryData: Omit<Category, 'id' | 'user_id' | 'project_id'>, project_id?: string): Promise<Category> => {
    if (!user) throw new Error("User not authenticated");
    const personalProject = allProjects.find(p => p.name === PERSONAL_PROJECT_NAME);
    const finalProjectId = project_id === personalProject?.id ? project_id : (project_id && project_id !== 'all' ? project_id : personalProject?.id);
    const { data: newCategory, error } = await supabase.from('categories').insert({ ...categoryData, project_id: finalProjectId, user_id: user.id }).select().single();
    if (error) throw error;
    setAllCategories(prev => [...prev, newCategory]);
    return newCategory;
  };

  const updateCategory = async (categoryId: string, categoryData: Partial<Omit<Category, 'id' | 'user_id'>>) => {
    const { data: updatedCategory, error } = await supabase.from('categories').update(categoryData).eq('id', categoryId).select().single();
    if (error) throw error;
    setAllCategories(prev => prev.map(c => c.id === updatedCategory.id ? updatedCategory : c));
  };
  
  const deleteCategory = async (categoryId: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', categoryId);
    if (error) throw error;
    setAllCategories(prev => prev.filter(c => c.id !== categoryId));
  };

  const updateAccountBalance = useCallback(async (account_id: string, amount: number, operation: 'add' | 'subtract') => {
      const accountToUpdate = allBankAccounts.find(acc => acc.id === account_id);
      if (!accountToUpdate) {
          console.error("Account not found for balance update");
          return;
      }
      const newBalance = operation === 'add' ? accountToUpdate.balance + amount : accountToUpdate.balance - amount;
      const { data: updatedAccount, error } = await supabase.from('bank_accounts').update({ balance: newBalance }).eq('id', account_id).select().single();
      if (error) {
        console.error("Error updating balance:", error);
      } else if (updatedAccount) {
        setAllBankAccounts(prev => prev.map(acc => acc.id === updatedAccount.id ? updatedAccount : acc));
      }
  }, [allBankAccounts]);

  const addTransaction = async (transactionData: Omit<Transaction, 'id'| 'date' | 'user_id'>, returnRef = false): Promise<{ id: string } | void> => {
    if (!user) throw new Error("User not authenticated");
    const dbTransaction: Omit<Transaction, 'id'> & { user_id: string; date: string; } = {
        ...transactionData,
        user_id: user.id,
        date: new Date().toISOString(),
    };
    
    const { data: newTransaction, error } = await supabase.from('transactions').insert(dbTransaction).select().single();
    if (error) throw error;
    
    setAllTransactions(prev => [...prev, newTransaction]);

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
    const { data: updatedTransaction, error } = await supabase.from('transactions').update(updatedData).eq('id', originalTransaction.id).select().single();
    if (error) throw error;
    
    setAllTransactions(prev => prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t));

    if (updatedTransaction.account_id) {
        if (updatedTransaction.type === 'income') await updateAccountBalance(updatedTransaction.account_id, updatedTransaction.amount, 'add');
        if (updatedTransaction.type === 'expense') await updateAccountBalance(updatedTransaction.account_id, updatedTransaction.amount, 'subtract');
    }
  };

  const deleteTransaction = async (transactionToDelete: Transaction) => {
    if (transactionToDelete.account_id) {
        if (transactionToDelete.type === 'income') { await updateAccountBalance(transactionToDelete.account_id, transactionToDelete.amount, 'subtract'); } 
        else if (transactionToDelete.type === 'expense') { await updateAccountBalance(transactionToDelete.account_id, transactionToDelete.amount, 'add'); }
    }
    const { error } = await supabase.from('transactions').delete().eq('id', transactionToDelete.id);
    if (error) throw error;
    setAllTransactions(prev => prev.filter(t => t.id !== transactionToDelete.id));
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
    
    const debtName = allClients.find(c => c.id === newDebt.client_id)?.name || 'Unknown Client';
    setAllDebts(prev => [...prev, {...newDebt, name: debtName}]);

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
    const { data: updatedDebt, error } = await supabase.from('debts').update(updatedData).eq('id', originalDebt.id).select().single();
    if (error) throw error;

    const debtName = allClients.find(c => c.id === updatedDebt.client_id)?.name || 'Unknown Client';
    setAllDebts(prev => prev.map(d => d.id === updatedDebt.id ? {...updatedDebt, name: debtName} : d));
  };

  const deleteDebt = async (debtToDelete: Debt) => {
    if (debtToDelete.account_id) {
        if (debtToDelete.type === 'creditor') { await updateAccountBalance(debtToDelete.account_id, debtToDelete.amount, 'subtract'); } 
        else { await updateAccountBalance(debtToDelete.account_id, debtToDelete.amount, 'add'); }
    }
    const { error } = await supabase.from('debts').delete().eq('id', debtToDelete.id);
    if (error) throw error;
    setAllDebts(prev => prev.filter(d => d.id !== debtToDelete.id));
  };

  const addRepayment = async (debt: Debt, amount: number, account_id: string) => {
    await updateDebt(debt, { amount: debt.amount - amount });
    await addTransaction({ type: 'repayment', amount, category: 'Debt Repayment', description: `Payment for debt: ${debt.name}`, debt_id: debt.id, account_id: account_id, project_id: debt.project_id });
  };

  const addBankAccount = async (account: Omit<BankAccount, 'id' | 'user_id' | 'is_primary'>, project_id?: string) => {
    if (!user) return;
    const personalProject = allProjects.find(p => p.name === PERSONAL_PROJECT_NAME);
    const finalProjectId = project_id || personalProject?.id;
    const { data: newAccount, error } = await supabase.from('bank_accounts').insert({ ...account, user_id: user.id, project_id: finalProjectId, is_primary: allBankAccounts.length === 0 }).select().single();
    if (error) throw error;
    setAllBankAccounts(prev => [...prev, newAccount]);
  };

  const updateBankAccount = async (accountId: string, accountData: Partial<Omit<BankAccount, 'id' | 'user_id'>>) => {
    const { data: updatedAccount, error } = await supabase.from('bank_accounts').update(accountData).eq('id', accountId).select().single();
    if (error) throw error;
    setAllBankAccounts(prev => prev.map(acc => acc.id === updatedAccount.id ? updatedAccount : acc));
  };
  
  const linkBankAccount = async (accountId: string, projectId: string) => {
    const { data: updatedAccount, error } = await supabase.from('bank_accounts').update({ project_id: projectId }).eq('id', accountId).select().single();
    if (error) throw error;
    setAllBankAccounts(prev => prev.map(acc => acc.id === updatedAccount.id ? updatedAccount : acc));
  };

  const deleteBankAccount = async (accountId: string) => {
    const { error } = await supabase.from('bank_accounts').delete().eq('id', accountId);
    if (error) throw error;
    setAllBankAccounts(prev => prev.filter(b => b.id !== accountId));
  };

  const setCurrency = useCallback((newCurrency: string) => { setCurrencyState(newCurrency); }, []);

  const setPrimaryBankAccount = async (accountId: string) => {
    if (!user) return;
    
    // Optimistically update UI
    const originalAccounts = allBankAccounts;
    setAllBankAccounts(prev => prev.map(acc => ({...acc, is_primary: acc.id === accountId})));

    try {
        const { error: errorClear } = await supabase.from('bank_accounts').update({ is_primary: false }).eq('user_id', user.id);
        if (errorClear) throw errorClear;

        const { error: errorSet } = await supabase.from('bank_accounts').update({ is_primary: true }).eq('id', accountId);
        if (errorSet) throw errorSet;
    } catch (error) {
        // Revert UI on error
        setAllBankAccounts(originalAccounts);
        console.error("Failed to set primary bank account:", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not update primary bank account.'
        });
    }
  };

  const getTransactionById = useCallback((id: string) => allTransactions.find(t => t.id === id), [allTransactions]);
  const getDebtById = useCallback((id: string) => allDebts.find(d => d.id === id), [allDebts]);

  const addTask = async (taskData: Omit<Task, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return;
    const personalProject = allProjects.find(p => p.name === PERSONAL_PROJECT_NAME);
    const finalProjectId = taskData.project_id === personalProject?.id ? taskData.project_id : (taskData.project_id || personalProject?.id);

    const { data: newTask, error } = await supabase.from('tasks').insert({ ...taskData, project_id: finalProjectId, user_id: user.id, created_at: new Date().toISOString() }).select().single();
    if (error) throw error;
    setAllTasks(prev => [...prev, newTask]);
  };

  const updateTask = async (taskId: string, taskData: Partial<Omit<Task, 'id' | 'user_id'>>) => {
    const { data: updatedTask, error } = await supabase.from('tasks').update(taskData).eq('id', taskId).select().single();
    if (error) throw error;
    setAllTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) throw error;
    setAllTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const addCredential = async (credentialData: Omit<Credential, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return;
    const personalProject = allProjects.find(p => p.name === PERSONAL_PROJECT_NAME);
    const finalProjectId = credentialData.project_id === personalProject?.id ? credentialData.project_id : (credentialData.project_id || personalProject?.id);
    
    const dbData = {
      ...credentialData,
      project_id: finalProjectId,
      user_id: user.id,
      created_at: new Date().toISOString()
    };
    const { data: newCredential, error } = await supabase.from('credentials').insert(dbData).select().single();
    if (error) throw error;
    setAllCredentials(prev => [...prev, newCredential]);
  };

  const updateCredential = async (credentialId: string, credentialData: Partial<Omit<Credential, 'id' | 'user_id'>>) => {
    const { data: updatedCredential, error } = await supabase.from('credentials').update(credentialData).eq('id', credentialId).select().single();
    if (error) throw error;
    setAllCredentials(prev => prev.map(c => c.id === updatedCredential.id ? updatedCredential : c));
  };
  
  const deleteCredential = async (credentialId: string) => {
    const { error } = await supabase.from('credentials').delete().eq('id', credentialId);
    if (error) throw error;
    setAllCredentials(prev => prev.filter(c => c.id !== credentialId));
  };
  
  const filteredTransactions = useMemo(() => {
    const personalProject = allProjects.find(p => p.name === PERSONAL_PROJECT_NAME);
    return (activeProject && activeProject.id !== 'all') 
      ? allTransactions.filter(t => t.project_id === activeProject.id) 
      : allTransactions.filter(t => t.project_id === personalProject?.id || !t.project_id);
  }, [allTransactions, activeProject, allProjects]);

  const filteredDebts = useMemo(() => {
    const personalProject = allProjects.find(p => p.name === PERSONAL_PROJECT_NAME);
    if (activeProject && activeProject.id !== 'all') {
      return allDebts.filter(d => d.project_id === activeProject.id);
    }
    return allDebts.filter(d => d.project_id === personalProject?.id || !d.project_id);
  }, [allDebts, activeProject, allProjects]);
  
  const filteredClients = useMemo(() => {
    const personalProject = allProjects.find(p => p.name === PERSONAL_PROJECT_NAME);
      if (activeProject && activeProject.id !== 'all') {
        return allClients.filter(c => c.project_id === activeProject.id);
      }
      return allClients.filter(c => c.project_id === personalProject?.id || !c.project_id);
  }, [allClients, activeProject, allProjects]);

  const filteredCategories = useMemo(() => {
    const personalProject = allProjects.find(p => p.name === PERSONAL_PROJECT_NAME);
      if (activeProject && activeProject.id !== 'all') {
          return allCategories.filter(c => c.project_id === activeProject.id);
      }
      return allCategories.filter(c => c.project_id === personalProject?.id || !c.project_id);
  }, [allCategories, activeProject, allProjects]);

  const filteredTasks = useMemo(() => {
    const personalProject = allProjects.find(p => p.name === PERSONAL_PROJECT_NAME);
    return (activeProject && activeProject.id !== 'all') 
      ? allTasks.filter(t => t.project_id === activeProject.id) 
      : allTasks.filter(t => t.project_id === personalProject?.id || !t.project_id);
  }, [allTasks, activeProject, allProjects]);

  const filteredCredentials = useMemo(() => {
    const personalProject = allProjects.find(p => p.name === PERSONAL_PROJECT_NAME);
    return (activeProject && activeProject.id !== 'all') 
      ? allCredentials.filter(c => c.project_id === activeProject.id) 
      : allCredentials.filter(c => c.project_id === personalProject?.id || !c.project_id);
  }, [allCredentials, activeProject, allProjects]);

  const filteredBankAccounts = useMemo(() => {
      const personalProject = allProjects.find(p => p.name === PERSONAL_PROJECT_NAME);
      if (activeProject && activeProject.id !== 'all') {
          return allBankAccounts.filter(acc => acc.project_id === activeProject.id);
      }
      return allBankAccounts.filter(acc => acc.project_id === personalProject?.id || !acc.project_id);
  }, [allBankAccounts, activeProject, allProjects]);


  const contextValue: FinancialContextType = useMemo(() => ({
    projects: allProjects, activeProject, setActiveProject, defaultProject, setDefaultProject, addProject, updateProject, deleteProject,
    transactions: filteredTransactions, allTransactions, addTransaction, updateTransaction, deleteTransaction, getTransactionById,
    debts: filteredDebts, allDebts, addDebt, updateDebt, deleteDebt, addRepayment, getDebtById,
    bankAccounts: filteredBankAccounts, allBankAccounts, addBankAccount, updateBankAccount, deleteBankAccount, setPrimaryBankAccount, linkBankAccount,
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
      filteredBankAccounts, allBankAccounts,
      filteredClients,
      filteredCategories,
      filteredTasks,
      filteredCredentials,
      currency, setCurrency,
      isLoading, isUserLoading,
      updateAccountBalance,
      addTransaction, updateTransaction, deleteTransaction,
      addDebt, updateDebt, deleteDebt, addRepayment,
      addBankAccount, updateBankAccount, deleteBankAccount, setPrimaryBankAccount, linkBankAccount,
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
