

'use client';

import { createContext, useCallback, ReactNode, useMemo, useState, useEffect, useRef } from 'react';
import type { Transaction, Loan, BankAccount, Project, Client, Category, Task, Credential, Contact, ChatMessage } from '@/lib/types';
import { supabase } from '@/lib/supabase_client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './AuthContext';
import { syncTransactionsToSheet } from '@/services/google-sheets';
import { addDays, addMonths, addWeeks, parseISO } from 'date-fns';

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
  addTransactions: (transactions: Omit<Transaction, 'id' | 'date' | 'user_id'>[]) => Promise<{ id: string }[]>;
  updateTransaction: (transactionId: string, updatedData: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (transaction: Transaction, chatMessageId?: string) => Promise<void>;
  getTransactionById: (id: string) => Transaction | undefined;
  addRepayment: (loan: Loan, amount: number, accountId: string, returnRef?: boolean) => Promise<{ id: string } | void>;
  
  loans: Loan[];
  allLoans: Loan[];
  addLoan: (loanData: Omit<Loan, 'id' | 'user_id' | 'created_at' | 'date'>, returnRef?: boolean) => Promise<{ id: string } | void>;
  addLoans: (loans: Omit<Loan, 'id' | 'user_id' | 'created_at' | 'date'>[]) => Promise<void>;
  addOrUpdateLoan: (loanData: Omit<Loan, 'id' | 'user_id' | 'created_at' | 'date' | 'status'>, returnRef?: boolean) => Promise<{ id: string } | void>;
  updateLoan: (loanId: string, loanData: Partial<Omit<Loan, 'id' | 'user_id'>>) => Promise<void>;
  deleteLoan: (loanId: string, chatMessageId?: string) => Promise<void>;
  getLoanById: (id: string) => Loan | undefined;

  bankAccounts: BankAccount[];
  allBankAccounts: BankAccount[];
  addBankAccount: (account: Omit<BankAccount, 'id' | 'user_id' | 'is_primary'>, project_id?: string | undefined) => Promise<void>;
  updateBankAccount: (accountId: string, accountData: Partial<Omit<BankAccount, 'id' | 'user_id'>>) => Promise<void>;
  deleteBankAccount: (accountId: string) => Promise<void>;
  setPrimaryBankAccount: (accountId: string) => Promise<void>;
  linkBankAccount: (accountId: string, projectId: string) => Promise<void>;
  
  clients: Client[];
  allClients: Client[];
  addClient: (clientData: Omit<Client, 'id' | 'user_id' | 'project_id'>, project_id?: string) => Promise<Client>;
  updateClient: (clientId: string, clientData: Partial<Omit<Client, 'id' | 'user_id'>>) => Promise<void>;
  deleteClient: (clientId: string) => Promise<void>;

  contacts: Contact[];
  allContacts: Contact[];
  addContact: (contactData: Omit<Contact, 'id' | 'user_id'>) => Promise<Contact>;
  updateContact: (contactId: string, contactData: Partial<Omit<Contact, 'id' | 'user_id'>>) => Promise<void>;
  deleteContact: (contactId: string) => Promise<void>;

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

  chatMessages: ChatMessage[];
  hasMoreChatMessages: boolean;
  loadMoreChatMessages: () => Promise<void>;
  addChatMessage: (messageData: Omit<ChatMessage, 'id' | 'user_id' | 'timestamp'>) => Promise<void>;
  updateChatMessage: (messageId: string, messageData: Partial<ChatMessage>) => Promise<void>;
  deleteChatMessage: (messageId: string) => Promise<void>;

  currency: string;
  setCurrency: (currency: string) => void;
  isLoading: boolean;
  triggerSync: (projectId: string) => Promise<void>;
}

export const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

const useLocalStorageKey = (key: string, userId?: string | null) => {
  return userId ? `financeflow_${userId}_${key}` : null;
};

const cacheKey = (key: string, userId: string) => `financeflow_${userId}_${key}_cache`;

const PERSONAL_PROJECT_NAME = "Personal";

export function FinancialProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: isUserLoading } = useAuth();
  const { toast } = useToast();

  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [activeProject, _setActiveProject] = useState<Project | null>(null);
  const [defaultProject, _setDefaultProject] = useState<Project | null>(null);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [rawBankAccounts, setRawBankAccounts] = useState<BankAccount[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [allCredentials, setAllCredentials] = useState<Credential[]>([]);
  const [allLoans, setAllLoans] = useState<Loan[]>([]);
  const [allChatMessages, setAllChatMessages] = useState<ChatMessage[]>([]);
  const [hasMoreChatMessages, setHasMoreChatMessages] = useState(false);
  
  const [currency, setCurrencyState] = useState<string>('INR');
  const [isLoading, setIsLoading] = useState(true);

  // Define keys based on user ID
  const activeProjectKey = useLocalStorageKey('activeProject', user?.id);
  const currencyKey = useLocalStorageKey('currency', user?.id);
  const defaultProjectKey = useLocalStorageKey('defaultProject', user?.id);


  // Use refs to hold the latest state for use in callbacks that don't re-render
  const stateRef = useRef({
    allProjects,
    allTransactions,
    allLoans,
    allBankAccounts: rawBankAccounts,
    allClients,
    allContacts,
    user,
  });

  useEffect(() => {
    stateRef.current = {
      allProjects,
      allTransactions,
      allLoans,
      allBankAccounts: rawBankAccounts,
      allClients,
      allContacts,
      user,
    };
  }, [allProjects, allTransactions, allLoans, rawBankAccounts, allClients, allContacts, user]);

  const allBankAccounts = useMemo(() => {
    const balanceMap = new Map<string, number>();
    rawBankAccounts.forEach(acc => {
      balanceMap.set(acc.id, acc.balance); // Start with initial balance
    });
  
    [...allTransactions, ...allLoans].forEach(entry => {
      if ('category' in entry) { // Transaction
        const tx = entry as Transaction;
        if (tx.type === 'income' && tx.account_id && balanceMap.has(tx.account_id)) {
          balanceMap.set(tx.account_id, balanceMap.get(tx.account_id)! + tx.amount);
        } else if (tx.type === 'expense' && tx.account_id && balanceMap.has(tx.account_id)) {
          balanceMap.set(tx.account_id, balanceMap.get(tx.account_id)! - tx.amount);
        } else if (tx.type === 'transfer' && tx.from_account_id && tx.to_account_id) {
          if (balanceMap.has(tx.from_account_id)) {
            balanceMap.set(tx.from_account_id, balanceMap.get(tx.from_account_id)! - tx.amount);
          }
          if (balanceMap.has(tx.to_account_id)) {
            balanceMap.set(tx.to_account_id, balanceMap.get(tx.to_account_id)! + tx.amount);
          }
        }
      } else { // Loan
        const loan = entry as Loan;
        if (loan.account_id && balanceMap.has(loan.account_id)) {
          if (loan.type === 'loanTaken') {
            balanceMap.set(loan.account_id, balanceMap.get(loan.account_id)! + loan.amount);
          } else { // loanGiven
            balanceMap.set(loan.account_id, balanceMap.get(loan.account_id)! - loan.amount);
          }
        }
      }
    });

    // Also account for repayments
    allTransactions.filter(t => t.type === 'repayment').forEach(repayment => {
        const relatedLoan = allLoans.find(l => l.id === repayment.loan_id);
        if (relatedLoan && repayment.account_id && balanceMap.has(repayment.account_id)) {
            if (relatedLoan.type === 'loanGiven') { // Money coming back IN
                 balanceMap.set(repayment.account_id, balanceMap.get(repayment.account_id)! + repayment.amount);
            } else { // Paying back a loan you took, money OUT
                 balanceMap.set(repayment.account_id, balanceMap.get(repayment.account_id)! - repayment.amount);
            }
        }
    });
  
    return rawBankAccounts.map(acc => ({
      ...acc,
      balance: balanceMap.get(acc.id) ?? acc.balance,
    }));
  }, [rawBankAccounts, allTransactions, allLoans]);
  

  const loadMoreChatMessages = useCallback(async () => {
    // This function is now empty as we load all messages at once.
  }, []);

  const fetchData = useCallback(async (userId: string) => {
    // 1. Load from cache first
    const tables = ['projects', 'transactions', 'bank_accounts', 'clients', 'contacts', 'categories', 'tasks', 'credentials', 'loans', 'chat_messages'];
    let isDataLoadedFromCache = false;
    try {
        const cachedData = tables.map(table => JSON.parse(localStorage.getItem(cacheKey(table, userId)) || 'null'));
        if (cachedData.every(d => d !== null)) {
            setAllProjects(cachedData[0]);
            setAllTransactions(cachedData[1]);
            setRawBankAccounts(cachedData[2]);
            setAllClients(cachedData[3]);
            setAllContacts(cachedData[4]);
            setAllCategories(cachedData[5]);
            setAllTasks(cachedData[6]);
            setAllCredentials(cachedData[7]);
            setAllLoans(cachedData[8]);
            setAllChatMessages(cachedData[9]);
            isDataLoadedFromCache = true;
            setIsLoading(false);
        }
    } catch (e) {
        console.warn("Could not load data from cache", e);
    }


    // 2. Fetch from Supabase
    try {
      let [
        projectsRes,
        transactionsRes,
        bankAccountsRes,
        clientsRes,
        contactsRes,
        categoriesRes,
        tasksRes,
        credentialsRes,
        loansRes,
        chatMessagesRes,
        userSettingsRes
      ] = await Promise.all([
        supabase.from('projects').select('*').eq('user_id', userId),
        supabase.from('transactions').select('*').eq('user_id', userId),
        supabase.from('bank_accounts').select('*').eq('user_id', userId),
        supabase.from('clients').select('*').eq('user_id', userId),
        supabase.from('contacts').select('*').eq('user_id', userId),
        supabase.from('categories').select('*').eq('user_id', userId),
        supabase.from('tasks').select('*').eq('user_id', userId),
        supabase.from('credentials').select('*').eq('user_id', userId),
        supabase.from('loans').select('*').eq('user_id', userId),
        supabase.from('chat_messages').select('*').eq('user_id', userId).order('timestamp', { ascending: true }),
        supabase.from('user_settings').select('*').eq('user_id', userId).single(),
      ]);

      // Cache the fetched data
      localStorage.setItem(cacheKey('projects', userId), JSON.stringify(projectsRes.data || []));
      localStorage.setItem(cacheKey('transactions', userId), JSON.stringify(transactionsRes.data || []));
      localStorage.setItem(cacheKey('bank_accounts', userId), JSON.stringify(bankAccountsRes.data || []));
      localStorage.setItem(cacheKey('clients', userId), JSON.stringify(clientsRes.data || []));
      localStorage.setItem(cacheKey('contacts', userId), JSON.stringify(contactsRes.data || []));
      localStorage.setItem(cacheKey('categories', userId), JSON.stringify(categoriesRes.data || []));
      localStorage.setItem(cacheKey('tasks', userId), JSON.stringify(tasksRes.data || []));
      localStorage.setItem(cacheKey('credentials', userId), JSON.stringify(credentialsRes.data || []));
      localStorage.setItem(cacheKey('loans', userId), JSON.stringify(loansRes.data || []));
      localStorage.setItem(cacheKey('chat_messages', userId), JSON.stringify(chatMessagesRes.data || []));


      let projects = projectsRes.data || [];
      const hasPersonalProject = projects.some(p => p.name === PERSONAL_PROJECT_NAME);
      let personalProject = projects.find(p => p.name === PERSONAL_PROJECT_NAME);

      if (!hasPersonalProject) {
          const { data: newPersonalProject, error: personalProjectError } = await supabase.from('projects').insert({
              user_id: userId,
              name: PERSONAL_PROJECT_NAME,
              created_at: new Date().toISOString()
          }).select().single();
          
          if (personalProjectError) throw personalProjectError;
          if (newPersonalProject) {
            projects = [...projects, newPersonalProject];
            personalProject = newPersonalProject;
            localStorage.setItem(cacheKey('projects', userId), JSON.stringify(projects));
          }
      }

      setAllProjects(projects);
      setAllTransactions(transactionsRes.data || []);
      setRawBankAccounts(bankAccountsRes.data || []);
      setAllClients(clientsRes.data || []);
      setAllContacts(contactsRes.data || []);
      setAllCategories(categoriesRes.data || []);
      setAllTasks(tasksRes.data || []);
      setAllCredentials(credentialsRes.data || []);
      setAllLoans(loansRes.data || []);
      
      setAllChatMessages(chatMessagesRes.data || []);
      setHasMoreChatMessages(false);

      if ((!bankAccountsRes.data || bankAccountsRes.data.length === 0) && projects.length > 0) {
        const { data: newAccount } = await supabase.from('bank_accounts').insert({ user_id: userId, name: 'Primary Account', balance: 0, is_primary: true, project_id: personalProject?.id }).select().single();
        if (newAccount) {
            setRawBankAccounts([newAccount]);
            localStorage.setItem(cacheKey('bank_accounts', userId), JSON.stringify([newAccount]));
        }
      }
      
      const currencyToSet = userSettingsRes.data?.currency || 'INR';
      setCurrencyState(currencyToSet);
      
      const dbDefaultProjectId = userSettingsRes.data?.default_project_id;
      const defaultProj = projects.find(p => p.id === dbDefaultProjectId) || personalProject;
      _setDefaultProject(defaultProj || null);

      const storedActiveProject = activeProjectKey ? JSON.parse(localStorage.getItem(activeProjectKey) || 'null') : null;
      let activeProjectToSet: Project | null = defaultProj || null;
      if (storedActiveProject) activeProjectToSet = storedActiveProject;
      
      if (activeProjectToSet && (activeProjectToSet.id === 'all' || projects.some(p => p.id === activeProjectToSet!.id))) {
        _setActiveProject(activeProjectToSet);
      } else {
        _setActiveProject(defaultProj || null);
      }
      
    } catch (error) {
      console.error("Error fetching data from Supabase:", error);
      if (!isDataLoadedFromCache) {
        toast({ variant: 'destructive', title: 'Error fetching data', description: 'Could not load your financial data.' });
      }
    } finally {
      setIsLoading(false);
    }
  }, [toast, activeProjectKey]);


  const triggerSync = useCallback(async (projectId: string) => {
    await new Promise(resolve => setTimeout(resolve, 0));

    const { allProjects, allTransactions, allLoans, allBankAccounts, allClients, allContacts, user } = stateRef.current;
    
    const project = allProjects.find(p => p.id === projectId);
    if (project?.google_sheet_id && user) {
        console.log(`Auto-syncing project: ${project.name}`);
        await syncTransactionsToSheet({
            sheetId: project.google_sheet_id,
            transactions: allTransactions.filter(t => t.project_id === projectId),
            loans: allLoans.filter(l => l.project_id === projectId),
            bankAccounts: allBankAccounts.filter(b => b.project_id === projectId),
            clients: allClients.filter(c => c.project_id === projectId),
            contacts: allContacts,
            userId: user.id,
            readFromSheet: false,
        });
    }
  }, []);


  useEffect(() => {
    if (user && !isUserLoading) {
      fetchData(user.id);
    } else if (!isUserLoading) {
      setIsLoading(false);
    }
  }, [user, isUserLoading, fetchData]);
  
  // Helper to update state and cache
  const updateStateAndCache = <T,>(
    stateSetter: React.Dispatch<React.SetStateAction<T[]>>,
    cacheTableName: string,
    dataOrFn: T[] | ((prev: T[]) => T[])
  ) => {
    stateSetter(prev => {
        const newState = typeof dataOrFn === 'function' ? dataOrFn(prev) : dataOrFn;
        if (user) {
            localStorage.setItem(cacheKey(cacheTableName, user.id), JSON.stringify(newState));
        }
        return newState;
    });
  };


  const setCurrency = useCallback((newCurrency: string) => {
    setCurrencyState(newCurrency);
     if (currencyKey) {
          localStorage.setItem(currencyKey, newCurrency);
          if (user) {
              supabase.from('user_settings').upsert({ user_id: user.id, currency: newCurrency, default_project_id: defaultProject?.id }).then();
          }
      }
  }, [currencyKey, user, defaultProject]);

  const setActiveProject = useCallback((project: Project | null) => {
    _setActiveProject(project);
    if (activeProjectKey) {
      localStorage.setItem(activeProjectKey, JSON.stringify(project));
    }
  }, [activeProjectKey]);
  
  const setDefaultProject = useCallback(async (project: Project | null) => {
    if (!user) return;
    _setDefaultProject(project);
     if (defaultProjectKey) localStorage.setItem(defaultProjectKey, JSON.stringify(project));
    
    try {
        const { error } = await supabase.from('user_settings').upsert({ 
            user_id: user.id, 
            default_project_id: project?.id,
            currency: currency,
        });
        if (error) throw error;
    } catch (dbError) {
        console.error("Failed to save default project to DB:", dbError);
        toast({ variant: 'destructive', title: 'Error saving setting' });
    }
  }, [user, toast, currency, defaultProjectKey]);

  const addProject = async (projectData: Omit<Project, 'id' | 'user_id' | 'created_at'>): Promise<Project> => {
    if (!user) throw new Error("User not authenticated");
    const dbProject = { 
        ...projectData,
        user_id: user.id, 
        created_at: new Date().toISOString()
    };
    const { data: newProject, error } = await supabase.from('projects').insert(dbProject).select().single();
    if (error) throw error;
    updateStateAndCache(setAllProjects, 'projects', (prev: Project[]) => [...prev, newProject]);
    return newProject;
  };

  const updateProject = async (projectId: string, projectData: Partial<Omit<Project, 'id' | 'user_id' | 'created_at'>>) => {
    const { data: updatedProject, error } = await supabase.from('projects').update(projectData).eq('id', projectId).select().single();
    if (error) throw error;
    updateStateAndCache(setAllProjects, 'projects', (prev: Project[]) => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  const deleteProject = async (projectId: string) => {
    if (!user) throw new Error("User not authenticated");
    if (allProjects.find(p => p.id === projectId)?.name === PERSONAL_PROJECT_NAME) {
        toast({variant: 'destructive', title: "Cannot delete Personal business"});
        return;
    }
    
    const { error } = await supabase.rpc('delete_project_and_related_data', {
      p_id: projectId
    })

    if (error) {
        console.error('Error deleting project:', error);
        toast({ variant: 'destructive', title: "Error deleting business", description: "Could not delete the business and its related data." });
        return;
    }

    updateStateAndCache(setAllProjects, 'projects', (prev: Project[]) => prev.filter(p => p.id !== projectId));
    updateStateAndCache(setAllTransactions, 'transactions', (prev: Transaction[]) => prev.filter(t => t.project_id !== projectId));
    updateStateAndCache(setAllClients, 'clients', (prev: Client[]) => prev.filter(c => c.project_id !== projectId));
    updateStateAndCache(setAllCategories, 'categories', (prev: Category[]) => prev.filter(c => c.project_id !== projectId));
    updateStateAndCache(setAllTasks, 'tasks', (prev: Task[]) => prev.filter(t => t.project_id !== projectId));
    updateStateAndCache(setAllCredentials, 'credentials', (prev: Credential[]) => prev.filter(c => c.project_id !== projectId));
    updateStateAndCache(setRawBankAccounts, 'bank_accounts', (prev: BankAccount[]) => prev.filter(b => b.project_id !== projectId));
    updateStateAndCache(setAllLoans, 'loans', (prev: Loan[]) => prev.filter(l => l.project_id !== projectId));
    
    if (activeProject?.id === projectId) {
        setActiveProject(allProjects.find(p => p.name === PERSONAL_PROJECT_NAME) || null);
    }

    toast({ title: 'Business Deleted', description: 'The business and all its data have been removed.' });
  };

  const addClient = async (clientData: Omit<Client, 'id' | 'user_id' | 'project_id'>, project_id?: string): Promise<Client> => {
    if (!user) throw new Error("User not authenticated");
    const personalProject = allProjects.find(p => p.name === PERSONAL_PROJECT_NAME);
    const finalProjectId = project_id === personalProject?.id ? project_id : (project_id && project_id !== 'all' ? project_id : personalProject?.id);

    const { data: newClient, error } = await supabase.from('clients').insert({ ...clientData, project_id: finalProjectId, user_id: user.id }).select().single();
    if (error) throw error;
    updateStateAndCache(setAllClients, 'clients', (prev: Client[]) => [...prev, newClient]);
    if (finalProjectId) triggerSync(finalProjectId);
    return newClient;
  };

  const updateClient = async (clientId: string, clientData: Partial<Omit<Client, 'id' | 'user_id'>>) => {
    const { data: updatedClient, error } = await supabase.from('clients').update(clientData).eq('id', clientId).select().single();
    if (error) throw error;
    updateStateAndCache(setAllClients, 'clients', (prev: Client[]) => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
    if (updatedClient.project_id) triggerSync(updatedClient.project_id);
  };
  
  const deleteClient = async (clientId: string) => {
    const clientToDelete = allClients.find(c => c.id === clientId);
    const { error } = await supabase.from('clients').delete().eq('id', clientId);
    if (error) throw error;
    updateStateAndCache(setAllClients, 'clients', (prev: Client[]) => prev.filter(c => c.id !== clientId));
    if (clientToDelete?.project_id) triggerSync(clientToDelete.project_id);
  };

  const addContact = async (contactData: Omit<Contact, 'id' | 'user_id'>): Promise<Contact> => {
    if (!user) throw new Error("User not authenticated");

    const { data: newContact, error } = await supabase.from('contacts').insert({ ...contactData, user_id: user.id }).select().single();
    if (error) throw error;
    updateStateAndCache(setAllContacts, 'contacts', (prev: Contact[]) => [...prev, newContact]);
    return newContact;
  };

  const updateContact = async (contactId: string, contactData: Partial<Omit<Contact, 'id' | 'user_id'>>) => {
    const { data: updatedContact, error } = await supabase.from('contacts').update(contactData).eq('id', contactId).select().single();
    if (error) throw error;
    updateStateAndCache(setAllContacts, 'contacts', (prev: Contact[]) => prev.map(c => c.id === updatedContact.id ? updatedContact : c));
  };
  
  const deleteContact = async (contactId: string) => {
    await supabase.from('loans').update({ contact_id: null }).eq('contact_id', contactId);
    const { error } = await supabase.from('contacts').delete().eq('id', contactId);
    if (error) throw error;
    updateStateAndCache(setAllContacts, 'contacts', (prev: Contact[]) => prev.filter(c => c.id !== contactId));
  };

  const addCategory = async (categoryData: Omit<Category, 'id' | 'user_id' | 'project_id'>, project_id?: string): Promise<Category> => {
    if (!user) throw new Error("User not authenticated");
    const personalProject = allProjects.find(p => p.name === PERSONAL_PROJECT_NAME);
    const finalProjectId = project_id === personalProject?.id ? project_id : (project_id && project_id !== 'all' ? project_id : personalProject?.id);
    const { data: newCategory, error } = await supabase.from('categories').insert({ ...categoryData, project_id: finalProjectId, user_id: user.id }).select().single();
    if (error) throw error;
    updateStateAndCache(setAllCategories, 'categories', (prev: Category[]) => [...prev, newCategory]);
    if (finalProjectId) triggerSync(finalProjectId);
    return newCategory;
  };

  const updateCategory = async (categoryId: string, categoryData: Partial<Omit<Category, 'id' | 'user_id'>>) => {
    const { data: updatedCategory, error } = await supabase.from('categories').update(categoryData).eq('id', categoryId).select().single();
    if (error) throw error;
    updateStateAndCache(setAllCategories, 'categories', (prev: Category[]) => prev.map(c => c.id === updatedCategory.id ? updatedCategory : c));
    if (updatedCategory.project_id) triggerSync(updatedCategory.project_id);
  };
  
  const deleteCategory = async (categoryId: string) => {
    const categoryToDelete = allCategories.find(c => c.id === categoryId);
    const { error } = await supabase.from('categories').delete().eq('id', categoryId);
    if (error) throw error;
    updateStateAndCache(setAllCategories, 'categories', (prev: Category[]) => prev.filter(c => c.id !== categoryId));
    if (categoryToDelete?.project_id) triggerSync(categoryToDelete.project_id);
  };

  const addTransactions = async (transactions: Omit<Transaction, 'id' | 'date' | 'user_id'>[]): Promise<{ id: string }[]> => {
    if (!user || transactions.length === 0) return [];
    const dbTransactions = transactions.map(t => ({
      ...t,
      project_id: t.project_id || (allProjects.find(p => p.name === PERSONAL_PROJECT_NAME))?.id,
      user_id: user.id,
      date: new Date().toISOString(),
    }));

    const { data: newTransactions, error } = await supabase.from('transactions').insert(dbTransactions).select();
    if (error) throw error;
    
    updateStateAndCache(setAllTransactions, 'transactions', (prev: Transaction[]) => [...prev, ...newTransactions]);
    
    const projectIds = [...new Set(newTransactions.map(t => t.project_id).filter(Boolean))];
    for (const projectId of projectIds) {
      triggerSync(projectId!);
    }
    return newTransactions.map(t => ({ id: t.id }));
  };

  const addLoans = async (loans: Omit<Loan, 'id' | 'user_id' | 'created_at' | 'date'>[]) => {
    if (!user || loans.length === 0) return;
    const now = new Date().toISOString();
    const dbLoans = loans.map(l => ({
      ...l,
      project_id: l.project_id || (allProjects.find(p => p.name === PERSONAL_PROJECT_NAME))?.id,
      date: now,
      created_at: now,
      user_id: user.id,
    }));

    const { data: newLoans, error } = await supabase.from('loans').insert(dbLoans).select();
    if (error) throw error;

    updateStateAndCache(setAllLoans, 'loans', (prev: Loan[]) => [...prev, ...newLoans]);

    const projectIds = [...new Set(newLoans.map(l => l.project_id).filter(Boolean))];
    for (const projectId of projectIds) {
      triggerSync(projectId!);
    }
  };

  const addTransaction = async (transactionData: Omit<Transaction, 'id'| 'date' | 'user_id'>, returnRef = false): Promise<{ id: string } | void> => {
    if (!user) throw new Error("User not authenticated");
    const personalProject = allProjects.find(p => p.name === PERSONAL_PROJECT_NAME);
    const dbTransaction = {
      ...transactionData,
      project_id: transactionData.project_id || personalProject?.id,
      user_id: user.id,
      date: new Date().toISOString(),
    };
    
    const { data: newTransaction, error } = await supabase.from('transactions').insert(dbTransaction).select().single();
    if (error) throw error;
    
    updateStateAndCache(setAllTransactions, 'transactions', (prev: Transaction[]) => [...prev, newTransaction]);
    if (newTransaction.project_id) triggerSync(newTransaction.project_id);

    if (returnRef) return { id: newTransaction.id };
  };

  const updateTransaction = async (transactionId: string, updatedData: Partial<Transaction>) => {
    const { data: updatedTransaction, error } = await supabase.from('transactions').update(updatedData).eq('id', transactionId).select().single();
    if (error) throw error;
    
    updateStateAndCache(setAllTransactions, 'transactions', (prev: Transaction[]) => prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t));
    if (updatedTransaction.project_id) triggerSync(updatedTransaction.project_id);
  };

  const deleteTransaction = async (transactionToDelete: Transaction, chatMessageId?: string) => {
    if (chatMessageId) {
        const { error: chatError } = await supabase.from('chat_messages').delete().eq('id', chatMessageId);
        if (chatError) {
            console.error("Error deleting related chat message", chatError);
        } else {
            setAllChatMessages((prev) => prev.filter(m => m.id !== chatMessageId));
        }
    }

    // Special handling for transfer deletion
    if (transactionToDelete.type === 'transfer' && transactionToDelete.from_account_id && transactionToDelete.to_account_id) {
        const fromAccount = rawBankAccounts.find(acc => acc.id === transactionToDelete.from_account_id);
        const toAccount = rawBankAccounts.find(acc => acc.id === transactionToDelete.to_account_id);
        
        if (fromAccount && toAccount) {
            const updates = [
                supabase.from('bank_accounts').update({ balance: fromAccount.balance + transactionToDelete.amount }).eq('id', fromAccount.id),
                supabase.from('bank_accounts').update({ balance: toAccount.balance - transactionToDelete.amount }).eq('id', toAccount.id)
            ];
            const results = await Promise.all(updates);
            const updateError = results.some(res => res.error);
            if (updateError) {
                console.error("Failed to reverse transfer balances in DB");
                // Don't proceed with deletion if we can't update balances
                toast({ variant: 'destructive', title: 'Deletion Failed', description: 'Could not update account balances.' });
                return;
            }
        }
    }
    
    const { error } = await supabase.from('transactions').delete().eq('id', transactionToDelete.id);
    if (error) {
        console.error("Failed to delete transaction from DB:", error);
        toast({ variant: 'destructive', title: 'Deletion Failed', description: 'Could not delete the transaction. Please try again.' });
        return;
    }

    updateStateAndCache(setAllTransactions, 'transactions', (prev) => prev.filter(t => t.id !== transactionToDelete.id));

    if (transactionToDelete.project_id) {
        triggerSync(transactionToDelete.project_id);
    }
  };
    
  const addRepayment = async (loan: Loan, amount: number, accountId: string, returnRef = false): Promise<{ id: string } | void> => {
    if (!user) throw new Error("User not authenticated");

    const transactionData = {
        type: 'repayment' as 'repayment',
        amount,
        category: 'Loan Repayment',
        description: `Repayment for loan to/from ${allContacts.find(c => c.id === loan.contact_id)?.name || 'Unknown'}`,
        account_id: accountId,
        loan_id: loan.id,
        project_id: loan.project_id
    };

    const newDocRef = await addTransaction(transactionData, true);
    
    const totalRepaid = allTransactions
        .filter(t => t.loan_id === loan.id && t.type === 'repayment')
        .reduce((sum, t) => sum + t.amount, 0) + amount;
        
    if (totalRepaid >= loan.amount) {
        await updateLoan(loan.id, { status: 'paid' });
    }
    if (returnRef) return newDocRef as { id: string };
  };

  const addBankAccount = async (account: Omit<BankAccount, 'id' | 'user_id' | 'is_primary'>, project_id?: string) => {
    if (!user) return;
    const personalProject = allProjects.find(p => p.name === PERSONAL_PROJECT_NAME);
    const finalProjectId = project_id === personalProject?.id ? project_id : (project_id && project_id !== 'all' ? project_id : personalProject?.id);

    const { data: newAccount, error } = await supabase.from('bank_accounts').insert({ ...account, user_id: user.id, project_id: finalProjectId, is_primary: rawBankAccounts.length === 0 }).select().single();
    if (error) throw error;
    updateStateAndCache(setRawBankAccounts, 'bank_accounts', (prev: BankAccount[]) => [...prev, newAccount]);
    if (finalProjectId) triggerSync(finalProjectId);
  };

  const updateBankAccount = async (accountId: string, accountData: Partial<Omit<BankAccount, 'id' | 'user_id'>>) => {
    // Only 'name' and 'balance' (initial balance) can be updated.
    const { data: updatedAccount, error } = await supabase.from('bank_accounts').update({ name: accountData.name, balance: accountData.balance }).eq('id', accountId).select().single();
    if (error) throw error;
    updateStateAndCache(setRawBankAccounts, 'bank_accounts', (prev: BankAccount[]) => prev.map(acc => acc.id === updatedAccount.id ? updatedAccount : acc));
    if (updatedAccount.project_id) triggerSync(updatedAccount.project_id);
  };
  
  const linkBankAccount = async (accountId: string, projectId: string) => {
    const { data: updatedAccount, error } = await supabase.from('bank_accounts').update({ project_id: projectId }).eq('id', accountId).select().single();
    if (error) throw error;
    updateStateAndCache(setRawBankAccounts, 'bank_accounts', (prev: BankAccount[]) => prev.map(acc => acc.id === updatedAccount.id ? updatedAccount : acc));
    if (updatedAccount.project_id) triggerSync(updatedAccount.project_id);
  };

  const deleteBankAccount = async (accountId: string) => {
    const linkedLoans = allLoans.filter(l => l.account_id === accountId);
    if (linkedLoans.length > 0) {
        toast({
            variant: 'destructive',
            title: 'Cannot Delete Account',
            description: `This bank account is linked to ${linkedLoans.length} loan(s). Please re-assign them before deleting.`
        });
        return;
    }

    await supabase.from('transactions').update({ account_id: null }).eq('account_id', accountId);
    await supabase.from('transactions').update({ from_account_id: null }).eq('from_account_id', accountId);
    await supabase.from('transactions').update({ to_account_id: null }).eq('to_account_id', accountId);

    const accountToDelete = rawBankAccounts.find(b => b.id === accountId);
    const { error } = await supabase.from('bank_accounts').delete().eq('id', accountId);
    if (error) throw error;
    
    updateStateAndCache(setRawBankAccounts, 'bank_accounts', (prev: BankAccount[]) => prev.filter(b => b.id !== accountId));
    if (accountToDelete?.project_id) triggerSync(accountToDelete.project_id);
  };

  const setPrimaryBankAccount = async (accountId: string) => {
    if (!user) return;
    
    updateStateAndCache(setRawBankAccounts, 'bank_accounts', (prev: BankAccount[]) => prev.map(acc => ({...acc, is_primary: acc.id === accountId})));

    try {
        const { error: errorClear } = await supabase.from('bank_accounts').update({ is_primary: false }).eq('user_id', user.id);
        if (errorClear) throw errorClear;

        const { error: errorSet } = await supabase.from('bank_accounts').update({ is_primary: true }).eq('id', accountId);
        if (errorSet) throw errorSet;
    } catch (error) {
        updateStateAndCache(setRawBankAccounts, 'bank_accounts', (prev: BankAccount[]) => prev.map(acc => ({...acc, is_primary: acc.id === accountId ? false : acc.is_primary })));
        console.error("Failed to set primary bank account:", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not update primary bank account.'
        });
    }
  };

  const getTransactionById = useCallback((id: string) => allTransactions.find(t => t.id === id), [allTransactions]);
  const getLoanById = useCallback((id: string) => allLoans.find(l => l.id === id), [allLoans]);

  const addTask = async (taskData: Omit<Task, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return;
    const personalProject = allProjects.find(p => p.name === PERSONAL_PROJECT_NAME);
    const finalProjectId = taskData.project_id === personalProject?.id ? taskData.project_id : (taskData.project_id || personalProject?.id);

    const { data: newTask, error } = await supabase.from('tasks').insert({ ...taskData, project_id: finalProjectId, user_id: user.id, created_at: new Date().toISOString() }).select().single();
    if (error) throw error;
    updateStateAndCache(setAllTasks, 'tasks', (prev: Task[]) => [...prev, newTask]);
  };

  const updateTask = async (taskId: string, taskData: Partial<Omit<Task, 'id' | 'user_id' | 'created_at'>>) => {
    const originalTask = allTasks.find(t => t.id === taskId);
    
    const { data: updatedTask, error } = await supabase.from('tasks').update(taskData).eq('id', taskId).select().single();
    if (error) throw error;
    
    updateStateAndCache(setAllTasks, 'tasks', (prev: Task[]) => prev.map(t => t.id === updatedTask.id ? updatedTask : t));

    if (originalTask && updatedTask.status === 'done' && originalTask.status !== 'done' && updatedTask.recurrence && updatedTask.recurrence !== 'none') {
        let nextDueDate: Date | undefined;
        if (updatedTask.due_date) {
            const currentDueDate = parseISO(updatedTask.due_date);
            switch (updatedTask.recurrence) {
                case 'daily': nextDueDate = addDays(currentDueDate, 1); break;
                case 'weekly': nextDueDate = addWeeks(currentDueDate, 1); break;
                case 'monthly': nextDueDate = addMonths(currentDueDate, 1); break;
                default: break;
            }
        }
        
        if (nextDueDate) {
            const newTaskData: Omit<Task, 'id' | 'user_id' | 'created_at'> = {
                name: updatedTask.name,
                description: updatedTask.description,
                status: 'todo',
                project_id: updatedTask.project_id,
                due_date: nextDueDate.toISOString(),
                recurrence: updatedTask.recurrence,
            };
            await addTask(newTaskData);
        }
    }
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) throw error;
    updateStateAndCache(setAllTasks, 'tasks', (prev: Task[]) => prev.filter(t => t.id !== taskId));
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
    updateStateAndCache(setAllCredentials, 'credentials', (prev: Credential[]) => [...prev, newCredential]);
  };

  const updateCredential = async (credentialId: string, credentialData: Partial<Omit<Credential, 'id' | 'user_id'>>) => {
    const { data: updatedCredential, error } = await supabase.from('credentials').update(credentialData).eq('id', credentialId).select().single();
    if (error) throw error;
    updateStateAndCache(setAllCredentials, 'credentials', (prev: Credential[]) => prev.map(c => c.id === updatedCredential.id ? updatedCredential : c));
  };
  
  const deleteCredential = async (credentialId: string) => {
    const { error } = await supabase.from('credentials').delete().eq('id', credentialId);
    if (error) throw error;
    updateStateAndCache(setAllCredentials, 'credentials', (prev: Credential[]) => prev.filter(c => c.id !== credentialId));
  };
  
  const addLoan = async (loanData: Omit<Loan, 'id' | 'user_id' | 'created_at' | 'date'>, returnRef = false): Promise<{ id: string } | void> => {
    if (!user) throw new Error("User not authenticated");
    const now = new Date().toISOString();
    const personalProject = allProjects.find(p => p.name === PERSONAL_PROJECT_NAME);
    const dbLoan = {
      ...loanData,
      project_id: loanData.project_id || personalProject?.id,
      user_id: user.id,
      date: now,
      created_at: now,
    };
    const { data: newLoan, error } = await supabase.from('loans').insert(dbLoan).select().single();
    if (error) throw error;
    
    updateStateAndCache(setAllLoans, 'loans', (prev: Loan[]) => [...prev, newLoan]);
    if (newLoan.project_id) triggerSync(newLoan.project_id);

    if (returnRef) return { id: newLoan.id };
  };

  const addOrUpdateLoan = async (loanData: Omit<Loan, 'id' | 'user_id' | 'created_at' | 'date' | 'status'>, returnRef = false): Promise<{ id: string } | void> => {
    const existingLoan = allLoans.find(l => l.contact_id === loanData.contact_id && l.status === 'active' && l.type === loanData.type);
    if (existingLoan) {
      const newAmount = existingLoan.amount + loanData.amount;
      await updateLoan(existingLoan.id, { amount: newAmount });
      if (returnRef) return { id: existingLoan.id };
    } else {
      return addLoan({ ...loanData, status: 'active' }, returnRef);
    }
  };

  const updateLoan = async (loanId: string, loanData: Partial<Omit<Loan, 'id' | 'user_id'>>) => {
    const { data: updatedLoan, error } = await supabase.from('loans').update(loanData).eq('id', loanId).select().single();
    if (error) throw error;
    updateStateAndCache(setAllLoans, 'loans', (prev: Loan[]) => prev.map(l => l.id === updatedLoan.id ? updatedLoan : l));
    if (updatedLoan.project_id) triggerSync(updatedLoan.project_id);
  };

  const deleteLoan = async (loanId: string, chatMessageId?: string) => {
    const loanToDelete = allLoans.find(l => l.id === loanId);
    if (!loanToDelete) return;

    if (chatMessageId) {
        const { error } = await supabase.from('chat_messages').delete().eq('id', chatMessageId);
        if (error) console.error("Error deleting related chat message", error);
        else setAllChatMessages((prev: ChatMessage[]) => prev.filter(m => m.id !== chatMessageId));
    }

    const { error } = await supabase.from('loans').delete().eq('id', loanId);
    if (error) throw error;
    
    updateStateAndCache(setAllLoans, 'loans', (prev: Loan[]) => prev.filter(l => l.id !== loanId));
    if (loanToDelete.project_id) triggerSync(loanToDelete.project_id);
  };

  const addChatMessage = async (messageData: Omit<ChatMessage, 'id' | 'user_id' | 'timestamp'>) => {
    if (!user) throw new Error("User not authenticated");
    const dbMessage = {
      ...messageData,
      user_id: user.id,
      timestamp: new Date().toISOString(),
    };
    
    const { data: newMessage, error } = await supabase.from('chat_messages').insert(dbMessage).select().single();
    if (error) throw error;
    
    updateStateAndCache(setAllChatMessages, 'chat_messages', (prev: ChatMessage[]) => [...prev, newMessage]);
  };
  
  const updateChatMessage = async (messageId: string, messageData: Partial<ChatMessage>) => {
    const { data: updatedMessage, error } = await supabase.from('chat_messages').update(messageData).eq('id', messageId).select().single();
    if (error) throw error;
    updateStateAndCache(setAllChatMessages, 'chat_messages', (prev: ChatMessage[]) => prev.map(m => m.id === updatedMessage.id ? updatedMessage : m));
  };
  
  const deleteChatMessage = async (messageId: string) => {
    const { error } = await supabase.from('chat_messages').delete().eq('id', messageId);
    if (error) throw error;
    updateStateAndCache(setAllChatMessages, 'chat_messages', (prev: ChatMessage[]) => prev.filter(m => m.id !== messageId));
  };


  const filteredTransactions = useMemo(() => {
    const personalProject = allProjects.find(p => p.name === PERSONAL_PROJECT_NAME);
    return (activeProject && activeProject.id !== 'all') 
      ? allTransactions.filter(t => t.project_id === activeProject.id) 
      : (activeProject === null ? allTransactions : allTransactions.filter(t => t.project_id === personalProject?.id || !t.project_id));
  }, [allTransactions, activeProject, allProjects]);

  const filteredClients = useMemo(() => {
    const personalProject = allProjects.find(p => p.name === PERSONAL_PROJECT_NAME);
      if (activeProject && activeProject.id !== 'all') {
        return allClients.filter(c => c.project_id === activeProject.id);
      }
       return (activeProject === null ? allClients : allClients.filter(c => c.project_id === personalProject?.id || !c.project_id));
  }, [allClients, activeProject, allProjects]);

  const filteredContacts = useMemo(() => {
    return allContacts;
  }, [allContacts]);

  const filteredCategories = useMemo(() => {
    const personalProject = allProjects.find(p => p.name === PERSONAL_PROJECT_NAME);
      if (activeProject && activeProject.id !== 'all') {
          return allCategories.filter(c => c.project_id === activeProject.id);
      }
       return (activeProject === null ? allCategories : allCategories.filter(c => c.project_id === personalProject?.id || !c.project_id));
  }, [allCategories, activeProject, allProjects]);

  const filteredTasks = useMemo(() => {
    const personalProject = allProjects.find(p => p.name === PERSONAL_PROJECT_NAME);
    return (activeProject && activeProject.id !== 'all') 
      ? allTasks.filter(t => t.project_id === activeProject.id) 
      : (activeProject === null ? allTasks : allTasks.filter(t => t.project_id === personalProject?.id || !t.project_id));
  }, [allTasks, activeProject, allProjects]);

  const filteredCredentials = useMemo(() => {
    const personalProject = allProjects.find(p => p.name === PERSONAL_PROJECT_NAME);
    return (activeProject && activeProject.id !== 'all') 
      ? allCredentials.filter(c => c.project_id === activeProject.id) 
      : (activeProject === null ? allCredentials : allCredentials.filter(c => c.project_id === personalProject?.id || !c.project_id));
  }, [allCredentials, activeProject, allProjects]);

  const filteredBankAccounts = useMemo(() => {
      const personalProject = allProjects.find(p => p.name === PERSONAL_PROJECT_NAME);
      if (activeProject && activeProject.id !== 'all') {
          return allBankAccounts.filter(acc => acc.project_id === activeProject.id);
      }
      return (activeProject === null ? allBankAccounts : allBankAccounts.filter(acc => acc.project_id === personalProject?.id || !acc.project_id));
  }, [allBankAccounts, activeProject, allProjects]);
  
  const filteredLoans = useMemo(() => {
    const personalProject = allProjects.find(p => p.name === PERSONAL_PROJECT_NAME);
    if (activeProject && activeProject.id !== 'all') {
      return allLoans.filter(l => l.project_id === activeProject.id);
    }
    return (activeProject === null ? allLoans : allLoans.filter(l => l.project_id === personalProject?.id || !l.project_id));
  }, [allLoans, activeProject, allProjects]);

  const contextValue: FinancialContextType = useMemo(() => ({
    projects: allProjects, activeProject, setActiveProject, defaultProject, setDefaultProject, addProject, updateProject, deleteProject,
    transactions: filteredTransactions, allTransactions, addTransaction, addTransactions, updateTransaction, deleteTransaction, getTransactionById, addRepayment,
    bankAccounts: filteredBankAccounts, allBankAccounts, addBankAccount, updateBankAccount, deleteBankAccount, setPrimaryBankAccount, linkBankAccount,
    clients: filteredClients, allClients, addClient, updateClient, deleteClient,
    contacts: filteredContacts, allContacts, addContact, updateContact, deleteContact,
    categories: filteredCategories, addCategory, updateCategory, deleteCategory,
    tasks: filteredTasks, addTask, updateTask, deleteTask,
    credentials: filteredCredentials, addCredential, updateCredential, deleteCredential,
    loans: filteredLoans, allLoans, addLoan, addLoans, addOrUpdateLoan, updateLoan, deleteLoan, getLoanById,
    chatMessages: allChatMessages,
    hasMoreChatMessages,
    loadMoreChatMessages, 
    addChatMessage, 
    updateChatMessage, 
    deleteChatMessage,
    currency, setCurrency,
    isLoading: isLoading || isUserLoading,
    triggerSync,
  }), [
      allProjects, activeProject, defaultProject, filteredTransactions, allTransactions, filteredBankAccounts, allBankAccounts, filteredClients, allClients, filteredContacts, allContacts, filteredCategories, allTasks, filteredTasks, filteredCredentials, filteredLoans, allLoans, allChatMessages, hasMoreChatMessages, currency, isLoading, isUserLoading,
      setActiveProject, setDefaultProject, addProject, updateProject, deleteProject,
      addTransaction, addTransactions, updateTransaction, deleteTransaction, getTransactionById, addRepayment,
      addBankAccount, updateBankAccount, deleteBankAccount, setPrimaryBankAccount, linkBankAccount,
      addClient, updateClient, deleteClient,
      addContact, updateContact, deleteContact,
      addCategory, updateCategory, deleteCategory,
      addTask, updateTask, deleteTask,
      addCredential, updateCredential, deleteCredential,
      addLoan, addLoans, addOrUpdateLoan, updateLoan, deleteLoan, getLoanById,
      loadMoreChatMessages, addChatMessage, updateChatMessage, deleteChatMessage,
      setCurrency,
      triggerSync
    ]);

  return (
    <FinancialContext.Provider value={contextValue}>
      {children}
    </FinancialContext.Provider>
  );
}
