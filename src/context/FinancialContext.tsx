'use client';

import { createContext, useCallback, ReactNode, useMemo, useState, useEffect } from 'react';
import type { Transaction, Debt, BankAccount, UserSettings, Project, Client, Category, Task, Credential } from '@/lib/types';
import { supabase } from '@/lib/supabase_client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './AuthContext';

// Timestamps are stored as ISO 8061 strings.
export type LocalTimestamp = string;

// Frontend uses camelCase, DB uses snake_case. This context handles the mapping.
// Components will use these camelCase types.
export interface AppProject extends Omit<Project, 'user_id' | 'created_at' | 'parent_project_id' | 'google_sheet_id'> {
  userId: string;
  createdAt: LocalTimestamp;
  parentProjectId?: string;
  googleSheetId?: string;
}
export interface AppTask extends Omit<Task, 'user_id' | 'project_id' | 'due_date' | 'created_at'> {
  userId: string;
  projectId?: string;
  dueDate?: LocalTimestamp;
  createdAt: LocalTimestamp;
}
export interface AppCredential extends Omit<Credential, 'user_id' | 'project_id' | 'site_name' | 'totp_secret' | 'created_at'> {
    userId: string;
    projectId?: string;
    siteName: string;
    totpSecret?: string;
    createdAt: LocalTimestamp;
}
export interface AppTransaction extends Omit<Transaction, 'user_id' | 'project_id' | 'account_id' | 'from_account_id' | 'to_account_id' | 'debt_id' | 'client_id'> {
    userId: string;
    projectId?: string;
    accountId?: string;
    fromAccountId?: string;
    toAccountId?: string;
    debtId?: string;
    clientId?: string;
}
export interface AppDebt extends Omit<Debt, 'user_id' | 'project_id' | 'client_id' | 'due_date' | 'account_id'> {
    userId: string;
    projectId?: string;
    clientId: string;
    dueDate?: LocalTimestamp;
    accountId: string;
    name: string;
}
export interface AppBankAccount extends Omit<BankAccount, 'user_id' | 'is_primary'> {
    userId: string;
    isPrimary: boolean;
}
export interface AppClient extends Omit<Client, 'project_id'> {
    projectId?: string;
}
export interface AppCategory extends Omit<Category, 'project_id'> {
    projectId?: string;
}


interface FinancialContextType {
  projects: AppProject[];
  activeProject: AppProject | null;
  setActiveProject: (project: AppProject | null) => void;
  defaultProject: AppProject | null;
  setDefaultProject: (project: AppProject | null) => void;
  addProject: (projectData: Omit<AppProject, 'id' | 'userId' | 'createdAt'>) => Promise<AppProject>;
  updateProject: (projectId: string, projectData: Partial<Omit<AppProject, 'id' | 'userId' | 'createdAt'>>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  
  transactions: AppTransaction[];
  allTransactions: AppTransaction[];
  addTransaction: (transaction: Omit<AppTransaction, 'id' | 'date' | 'userId'>, returnRef?: boolean) => Promise<{ id: string } | void>;
  updateTransaction: (originalTransaction: AppTransaction, updatedData: Partial<AppTransaction>) => Promise<void>;
  deleteTransaction: (transaction: AppTransaction) => Promise<void>;
  getTransactionById: (id: string) => AppTransaction | undefined;
  
  debts: AppDebt[];
  allDebts: AppDebt[];
  addDebt: (debt: Omit<AppDebt, 'id' | 'date' | 'userId'>, returnRef?: boolean) => Promise<{ id: string } | void>;
  updateDebt: (originalDebt: AppDebt, updatedData: Partial<AppDebt>) => Promise<void>;
  deleteDebt: (debt: AppDebt) => Promise<void>;
  addRepayment: (debt: AppDebt, amount: number, accountId: string) => Promise<void>;
  getDebtById: (id: string) => AppDebt | undefined;

  bankAccounts: AppBankAccount[];
  addBankAccount: (account: Omit<AppBankAccount, 'id' | 'userId'>) => Promise<void>;
  updateBankAccount: (accountId: string, accountData: Partial<Omit<AppBankAccount, 'id' | 'userId'>>) => Promise<void>;
  deleteBankAccount: (accountId: string) => Promise<void>;
  setPrimaryBankAccount: (accountId: string) => Promise<void>;
  
  clients: AppClient[];
  addClient: (clientData: Omit<AppClient, 'id' | 'userId' | 'projectId'>, projectId?: string) => Promise<AppClient>;
  updateClient: (clientId: string, clientData: Partial<Omit<AppClient, 'id' | 'userId'>>) => Promise<void>;
  deleteClient: (clientId: string) => Promise<void>;

  categories: AppCategory[];
  addCategory: (categoryData: Omit<AppCategory, 'id' | 'userId' | 'projectId'>, projectId?: string) => Promise<AppCategory>;
  updateCategory: (categoryId: string, categoryData: Partial<Omit<AppCategory, 'id' | 'userId'>>) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  
  tasks: AppTask[];
  addTask: (taskData: Omit<AppTask, 'id' | 'userId' | 'created_at'>) => Promise<void>;
  updateTask: (taskId: string, taskData: Partial<Omit<AppTask, 'id' | 'userId' | 'created_at'>>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  
  credentials: AppCredential[];
  addCredential: (credentialData: Omit<AppCredential, 'id' | 'userId' | 'created_at'>) => Promise<void>;
  updateCredential: (credentialId: string, credentialData: Partial<Omit<AppCredential, 'id' | 'userId' | 'created_at'>>) => Promise<void>;
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

const ALL_BUSINESS_PROJECT: AppProject = { id: 'all', name: 'All Business', userId: '', createdAt: new Date().toISOString() };

// Mappers to convert between snake_case (DB) and camelCase (App)
const toAppProject = (p: Project): AppProject => ({ id: p.id, userId: p.user_id, name: p.name, createdAt: p.created_at, parentProjectId: p.parent_project_id, googleSheetId: p.google_sheet_id });
const fromAppProject = (p: Partial<AppProject>): Partial<Omit<Project, 'id' | 'user_id' | 'created_at'>> => ({ name: p.name, parent_project_id: p.parentProjectId, google_sheet_id: p.googleSheetId });

const toAppTask = (t: Task): AppTask => ({ id: t.id, userId: t.user_id, name: t.name, description: t.description, status: t.status, dueDate: t.due_date, createdAt: t.created_at, projectId: t.project_id });
const fromAppTask = (t: Partial<AppTask>): Partial<Omit<Task, 'id' | 'user_id'>> => ({ name: t.name, description: t.description, status: t.status, due_date: t.dueDate, project_id: t.projectId, created_at: t.createdAt });

const toAppCredential = (c: Credential): AppCredential => ({ id: c.id, userId: c.user_id, siteName: c.site_name, username: c.username, password: c.password, totpSecret: c.totp_secret, createdAt: c.created_at, projectId: c.project_id });
const fromAppCredential = (c: Partial<AppCredential>): Partial<Omit<Credential, 'id' | 'user_id'>> => ({ site_name: c.siteName, username: c.username, password: c.password, totp_secret: c.totpSecret, project_id: c.projectId, created_at: c.createdAt });

const toAppTransaction = (t: Transaction): AppTransaction => ({ ...t, userId: t.user_id, projectId: t.project_id, accountId: t.account_id, fromAccountId: t.from_account_id, toAccountId: t.to_account_id, debtId: t.debt_id, clientId: t.client_id });
const fromAppTransaction = (t: Partial<AppTransaction>): Partial<Omit<Transaction, 'id' | 'date'>> => ({ ...t, user_id: t.userId, project_id: t.projectId, account_id: t.accountId, from_account_id: t.fromAccountId, to_account_id: t.toAccountId, debt_id: t.debtId, client_id: t.clientId });

const toAppDebt = (d: Debt, clients: AppClient[]): AppDebt => ({ ...d, name: clients.find(c => c.id === d.client_id)?.name || 'Unknown Client', userId: d.user_id, projectId: d.project_id, clientId: d.client_id, dueDate: d.due_date, accountId: d.account_id });
const fromAppDebt = (d: Partial<AppDebt>): Partial<Omit<Debt, 'id' | 'date' | 'user_id'>> => ({ type: d.type, client_id: d.clientId, amount: d.amount, description: d.description, due_date: d.dueDate, account_id: d.accountId, project_id: d.projectId });

const toAppBankAccount = (b: BankAccount): AppBankAccount => ({ ...b, userId: b.user_id, isPrimary: b.is_primary });
const fromAppBankAccount = (b: Partial<AppBankAccount>): Partial<Omit<BankAccount, 'id' | 'user_id'>> => ({ name: b.name, balance: b.balance, is_primary: b.isPrimary });

const toAppClient = (c: Client): AppClient => ({ ...c, projectId: c.project_id });
const fromAppClient = (c: Partial<AppClient>): Partial<Omit<Client, 'id'>> => ({ name: c.name, project_id: c.projectId });

const toAppCategory = (c: Category): AppCategory => ({ ...c, projectId: c.project_id });
const fromAppCategory = (c: Partial<AppCategory>): Partial<Omit<Category, 'id'>> => ({ name: c.name, type: c.type, project_id: c.projectId });


export function FinancialProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: isUserLoading } = useAuth();
  const { toast } = useToast();

  const activeProjectKey = useLocalStorageKey('activeProject');
  const defaultProjectKey = useLocalStorageKey('defaultProject');
  const currencyKey = useLocalStorageKey('currency');

  const [allProjects, setAllProjects] = useState<AppProject[]>([]);
  const [activeProject, _setActiveProject] = useState<AppProject | null>(ALL_BUSINESS_PROJECT);
  const [defaultProject, _setDefaultProject] = useState<AppProject | null>(ALL_BUSINESS_PROJECT);
  const [allTransactions, setAllTransactions] = useState<AppTransaction[]>([]);
  const [allDebts, setAllDebts] = useState<AppDebt[]>([]);
  const [allBankAccounts, setAllBankAccounts] = useState<AppBankAccount[]>([]);
  const [allClients, setAllClients] = useState<AppClient[]>([]);
  const [allCategories, setAllCategories] = useState<AppCategory[]>([]);
  const [allTasks, setAllTasks] = useState<AppTask[]>([]);
  const [allCredentials, setAllCredentials] = useState<AppCredential[]>([]);
  
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
        supabase.from('clients').select('*'), // Not user-specific, but project-specific logic is applied below
        supabase.from('categories').select('*'), // Not user-specific, but project-specific
        supabase.from('tasks').select('*').eq('user_id', userId),
        supabase.from('credentials').select('*').eq('user_id', userId),
        supabase.from('user_settings').select('*').eq('user_id', userId).single(),
      ]);

      const projects = (projectsRes.data || []).map(toAppProject);
      const userProjectIds = new Set(projects.map(p => p.id));
      
      const clients = (clientsRes.data || []).filter(c => !c.project_id || userProjectIds.has(c.project_id)).map(toAppClient);
      const debts = (debtsRes.data || []).map(d => toAppDebt(d, clients));
      const categories = (categoriesRes.data || []).filter(c => !c.project_id || userProjectIds.has(c.project_id)).map(toAppCategory);

      setAllProjects(projects);
      setAllTransactions((transactionsRes.data || []).map(toAppTransaction));
      setAllDebts(debts);
      setAllBankAccounts((bankAccountsRes.data || []).map(toAppBankAccount));
      setAllClients(clients);
      setAllCategories(categories);
      setAllTasks((tasksRes.data || []).map(toAppTask));
      setAllCredentials((credentialsRes.data || []).map(toAppCredential));

      if (!bankAccountsRes.data || bankAccountsRes.data.length === 0) {
        const { data: newAccount } = await supabase.from('bank_accounts').insert({ user_id: userId, name: 'Primary Account', balance: 0, is_primary: true }).select().single();
        if (newAccount) setAllBankAccounts([toAppBankAccount(newAccount)]);
      }
      
      const currencyToSet = userSettingsRes.data?.currency || 'INR';
      setCurrencyState(currencyToSet);
      if (currencyKey) localStorage.setItem(currencyKey, currencyToSet);

      const storedDefaultProject = defaultProjectKey ? JSON.parse(localStorage.getItem(defaultProjectKey) || 'null') : null;
      let activeProjectToSet: AppProject | null = storedDefaultProject;
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
            case 'projects': setAllProjects(prev => [...prev, toAppProject(newRecord)]); break;
            case 'transactions': setAllTransactions(prev => [...prev, toAppTransaction(newRecord)]); break;
            case 'debts': setAllDebts(prev => [...prev, toAppDebt(newRecord, allClients)]); break;
            case 'bank_accounts': setAllBankAccounts(prev => [...prev, toAppBankAccount(newRecord)]); break;
            case 'clients': setAllClients(prev => [...prev, toAppClient(newRecord)]); break;
            case 'categories': setAllCategories(prev => [...prev, toAppCategory(newRecord)]); break;
            case 'tasks': setAllTasks(prev => [...prev, toAppTask(newRecord)]); break;
            case 'credentials': setAllCredentials(prev => [...prev, toAppCredential(newRecord)]); break;
        }
    };
    const handleUpdates = (payload: any) => {
        const { table, new: newRecord } = payload;
        switch (table) {
            case 'projects': setAllProjects(prev => prev.map(p => p.id === newRecord.id ? toAppProject(newRecord) : p)); break;
            case 'transactions': setAllTransactions(prev => prev.map(t => t.id === newRecord.id ? toAppTransaction(newRecord) : t)); break;
            case 'debts': 
                setAllDebts(prev => prev.map(d => d.id === newRecord.id ? toAppDebt(newRecord, allClients) : d));
                break;
            case 'bank_accounts': setAllBankAccounts(prev => prev.map(b => b.id === newRecord.id ? toAppBankAccount(newRecord) : b)); break;
            case 'clients': 
                setAllClients(prev => prev.map(c => c.id === newRecord.id ? toAppClient(newRecord) : c));
                setAllDebts(prev => prev.map(d => d.clientId === newRecord.id ? { ...d, name: newRecord.name } : d));
                break;
            case 'categories': setAllCategories(prev => prev.map(c => c.id === newRecord.id ? toAppCategory(newRecord) : c)); break;
            case 'tasks': setAllTasks(prev => prev.map(t => t.id === newRecord.id ? toAppTask(newRecord) : t)); break;
            case 'credentials': setAllCredentials(prev => prev.map(c => c.id === newRecord.id ? toAppCredential(newRecord) : c)); break;
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

  const setActiveProject = useCallback((project: AppProject | null) => {
    const projectToSet = project === null || project.id === 'all' ? ALL_BUSINESS_PROJECT : project;
    _setActiveProject(projectToSet);
    if (activeProjectKey) {
      localStorage.setItem(activeProjectKey, JSON.stringify(projectToSet));
    }
  }, [activeProjectKey]);
  
  const setDefaultProject = useCallback((project: AppProject | null) => {
    const projectToSet = project === null || project.id === 'all' ? ALL_BUSINESS_PROJECT : project;
    _setDefaultProject(projectToSet);
    if (defaultProjectKey) {
      localStorage.setItem(defaultProjectKey, JSON.stringify(projectToSet));
    }
  }, [defaultProjectKey]);

  const addProject = async (projectData: Omit<AppProject, 'id' | 'userId' | 'createdAt'>): Promise<AppProject> => {
    if (!user) throw new Error("User not authenticated");
    const dbProject = { 
        ...fromAppProject(projectData),
        user_id: user.id, 
        created_at: new Date().toISOString()
    };
    const { data: newProject, error } = await supabase.from('projects').insert(dbProject).select().single();
    if (error) throw error;
    return toAppProject(newProject);
  };

  const updateProject = async (projectId: string, projectData: Partial<Omit<AppProject, 'id' | 'userId' | 'createdAt'>>) => {
    const dbProject: Partial<Omit<Project, 'id' | 'user_id' | 'created_at'>> = fromAppProject(projectData);
    const { error } = await supabase.from('projects').update(dbProject).eq('id', projectId);
    if (error) throw error;
  };

  const deleteProject = async (projectId: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) throw error;
    if (activeProject?.id === projectId) setActiveProject(ALL_BUSINESS_PROJECT);
  };

  const addClient = async (clientData: Omit<AppClient, 'id' | 'userId'>, projectId?: string): Promise<AppClient> => {
    if (!user) throw new Error("User not authenticated");
    
    // Personal clients have no projectId.
    const finalProjectId = (projectId && projectId !== 'all') ? projectId : undefined;
    
    const dbData: Partial<Omit<Client, 'id'>> = {
      ...fromAppClient(clientData),
      project_id: finalProjectId,
    };
    const { data: newClient, error } = await supabase.from('clients').insert(dbData).select().single();
    if (error) throw error;
    return toAppClient(newClient);
  };

  const updateClient = async (clientId: string, clientData: Partial<Omit<AppClient, 'id'>>) => {
    const { error } = await supabase.from('clients').update(fromAppClient(clientData)).eq('id', clientId);
    if (error) throw error;
  };

  const deleteClient = async (clientId: string) => {
    const { error } = await supabase.from('clients').delete().eq('id', clientId);
    if (error) throw error;
  };

  const addCategory = async (categoryData: Omit<AppCategory, 'id' | 'userId'>, projectId?: string): Promise<AppCategory> => {
    if (!user) throw new Error("User not authenticated");
    const finalProjectId = (projectId && projectId !== 'all') ? projectId : undefined;
    const { data: newCategory, error } = await supabase.from('categories').insert({ ...fromAppCategory(categoryData), project_id: finalProjectId }).select().single();
    if (error) throw error;
    return toAppCategory(newCategory);
  };

  const updateCategory = async (categoryId: string, categoryData: Partial<Omit<AppCategory, 'id'>>) => {
    const { error } = await supabase.from('categories').update(fromAppCategory(categoryData)).eq('id', categoryId);
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

  const addTransaction = async (transactionData: Omit<AppTransaction, 'id'| 'date' | 'userId'>, returnRef = false): Promise<{ id: string } | void> => {
    if (!user) throw new Error("User not authenticated");
    const dbTransaction: Partial<Omit<Transaction, 'id'>> & { user_id: string; date: string; } = {
        ...fromAppTransaction(transactionData),
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

  const updateTransaction = async (originalTransaction: AppTransaction, updatedData: Partial<AppTransaction>) => {
    if (originalTransaction.accountId) {
      if (originalTransaction.type === 'income') await updateAccountBalance(originalTransaction.accountId, originalTransaction.amount, 'subtract');
      if (originalTransaction.type === 'expense') await updateAccountBalance(originalTransaction.accountId, originalTransaction.amount, 'add');
    }
    const dbUpdate: Partial<Omit<Transaction, 'id' | 'date'>> = fromAppTransaction(updatedData);
    const { error } = await supabase.from('transactions').update(dbUpdate).eq('id', originalTransaction.id);
    if (error) throw error;

    const finalTransaction = { ...originalTransaction, ...updatedData };
    if (finalTransaction.accountId) {
        if (finalTransaction.type === 'income') await updateAccountBalance(finalTransaction.accountId, finalTransaction.amount, 'add');
        if (finalTransaction.type === 'expense') await updateAccountBalance(finalTransaction.accountId, finalTransaction.amount, 'subtract');
    }
  };

  const deleteTransaction = async (transactionToDelete: AppTransaction) => {
    if (transactionToDelete.accountId) {
        if (transactionToDelete.type === 'income') { await updateAccountBalance(transactionToDelete.accountId, transactionToDelete.amount, 'subtract'); } 
        else if (transactionToDelete.type === 'expense') { await updateAccountBalance(transactionToDelete.accountId, transactionToDelete.amount, 'add'); }
    }
    const { error } = await supabase.from('transactions').delete().eq('id', transactionToDelete.id);
    if (error) throw error;
  };

  const addDebt = async (debtData: Omit<AppDebt, 'id' | 'date' | 'userId' | 'name'>, returnRef = false): Promise<{ id: string } | void> => {
    if (!user || !debtData.accountId) throw new Error("User not authenticated or missing accountId");
    
    const dbDebt: Omit<Debt, 'id'|'date'|'user_id'> & {user_id: string; date: string} = {
        ...fromAppDebt(debtData),
        user_id: user.id,
        date: new Date().toISOString(),
    };
    
    const { data: newDebt, error } = await supabase.from('debts').insert(dbDebt).select().single();
    if (error) throw error;

    if (newDebt.type === 'creditor') { await updateAccountBalance(newDebt.account_id, newDebt.amount, 'add'); } 
    else if (newDebt.type === 'debtor') { await updateAccountBalance(newDebt.account_id, newDebt.amount, 'subtract'); }
    if (returnRef) { return { id: newDebt.id }; }
  };

  const updateDebt = async (originalDebt: AppDebt, updatedData: Partial<AppDebt>) => {
    const amountDifference = (updatedData.amount ?? originalDebt.amount) - originalDebt.amount;
    if (amountDifference !== 0 && originalDebt.accountId) {
        if (originalDebt.type === 'creditor') { await updateAccountBalance(originalDebt.accountId, amountDifference, 'add'); } 
        else { await updateAccountBalance(originalDebt.accountId, amountDifference, 'subtract'); }
    }
    const dbUpdate: Partial<Omit<Debt, 'id' | 'date' | 'user_id'>> = fromAppDebt(updatedData);
    const { error } = await supabase.from('debts').update(dbUpdate).eq('id', originalDebt.id);
    if (error) throw error;
  };

  const deleteDebt = async (debtToDelete: AppDebt) => {
    if (debtToDelete.accountId) {
        if (debtToDelete.type === 'creditor') { await updateAccountBalance(debtToDelete.accountId, debtToDelete.amount, 'subtract'); } 
        else { await updateAccountBalance(debtToDelete.accountId, debtToDelete.amount, 'add'); }
    }
    const { error } = await supabase.from('debts').delete().eq('id', debtToDelete.id);
    if (error) throw error;
  };

  const addRepayment = async (debt: AppDebt, amount: number, accountId: string) => {
    await updateDebt(debt, { amount: debt.amount - amount });
    await addTransaction({ type: 'repayment', amount, category: 'Debt Repayment', description: `Payment for debt: ${debt.name}`, debtId: debt.id, accountId: accountId, projectId: debt.projectId });
  };

  const addBankAccount = async (account: Omit<AppBankAccount, 'id' | 'userId'>) => {
    if (!user) return;
    const { error } = await supabase.from('bank_accounts').insert({ ...fromAppBankAccount(account), user_id: user.id, is_primary: allBankAccounts.length === 0 });
    if (error) throw error;
  };

  const updateBankAccount = async (accountId: string, accountData: Partial<Omit<AppBankAccount, 'id' | 'userId'>>) => {
    const dbUpdate: Partial<Omit<BankAccount, 'id' | 'user_id'>> = fromAppBankAccount(accountData);
    const { error } = await supabase.from('bank_accounts').update(dbUpdate).eq('id', accountId);
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
    // Local state will be updated by the real-time subscription
  };

  const getTransactionById = useCallback((id: string) => allTransactions.find(t => t.id === id), [allTransactions]);
  const getDebtById = useCallback((id: string) => allDebts.find(d => d.id === id), [allDebts]);

  const addTask = async (taskData: Omit<AppTask, 'id' | 'userId' | 'created_at'>) => {
    if (!user) return;
    await supabase.from('tasks').insert({ ...fromAppTask(taskData), user_id: user.id, created_at: new Date().toISOString() });
  };

  const updateTask = async (taskId: string, taskData: Partial<Omit<AppTask, 'id' | 'userId'>>) => {
    await supabase.from('tasks').update(fromAppTask(taskData)).eq('id', taskId);
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) throw error;
  };

  const addCredential = async (credentialData: Omit<AppCredential, 'id' | 'userId' | 'created_at'>) => {
    if (!user) return;
    const dbData = {
      ...fromAppCredential(credentialData),
      user_id: user.id,
      created_at: new Date().toISOString()
    };
    await supabase.from('credentials').insert(dbData);
  };

  const updateCredential = async (credentialId: string, credentialData: Partial<Omit<AppCredential, 'id' | 'userId'>>) => {
    await supabase.from('credentials').update(fromAppCredential(credentialData)).eq('id', credentialId);
  };
  
  const deleteCredential = async (credentialId: string) => {
    const { error } = await supabase.from('credentials').delete().eq('id', credentialId);
    if (error) throw error;
  };
  
  const filteredTransactions = useMemo(() => (activeProject && activeProject.id !== 'all') ? allTransactions.filter(t => t.projectId === activeProject.id) : allTransactions.filter(t => !t.projectId), [allTransactions, activeProject]);
  const filteredDebts = useMemo(() => {
    if (activeProject && activeProject.id !== 'all') {
      return allDebts.filter(d => d.projectId === activeProject.id);
    }
    return allDebts.filter(d => !d.projectId);
  }, [allDebts, activeProject]);
  
  const filteredClients = useMemo(() => {
      if (activeProject && activeProject.id !== 'all') {
        return allClients.filter(c => c.projectId === activeProject.id);
      }
      // For "All Business", we don't show personal clients, only project-based ones. For personal view, we show only personal.
      return allClients.filter(c => !c.projectId);
  }, [allClients, activeProject]);

  const filteredCategories = useMemo(() => {
      if (activeProject && activeProject.id !== 'all') {
          return allCategories.filter(c => c.projectId === activeProject.id);
      }
      return allCategories.filter(c => !c.projectId);
  }, [allCategories, activeProject]);

  const filteredTasks = useMemo(() => (activeProject && activeProject.id !== 'all') ? allTasks.filter(t => t.projectId === activeProject.id) : allTasks.filter(t => !t.projectId), [allTasks, activeProject]);
  const filteredCredentials = useMemo(() => (activeProject && activeProject.id !== 'all') ? allCredentials.filter(c => c.projectId === activeProject.id) : allCredentials.filter(c => !c.projectId), [allCredentials, activeProject]);


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
      allProjects, activeProject, setActiveProject, defaultProject, setDefaultProject, addProject, updateProject, deleteProject,
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
      addCredential, updateCredential, deleteCredential
    ]);

  return (
    <FinancialContext.Provider value={contextValue}>
      {children}
    </FinancialContext.Provider>
  );
}
