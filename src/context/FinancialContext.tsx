'use client';

import { createContext, useCallback, ReactNode, useMemo, useState, useEffect, useRef } from 'react';
import type { Transaction, Loan, BankAccount, Project, Client, Category, Task, Credential, Contact } from '@/lib/types';
import { supabase } from '@/lib/supabase_client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './AuthContext';
import { syncTransactionsToSheet } from '@/services/google-sheets';

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
  updateTransaction: (transactionId: string, updatedData: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (transaction: Transaction) => Promise<void>;
  getTransactionById: (id: string) => Transaction | undefined;
  addRepayment: (loan: Loan, amount: number, accountId: string, returnRef?: boolean) => Promise<{ id: string } | void>;
  
  loans: Loan[];
  allLoans: Loan[];
  addLoan: (loanData: Omit<Loan, 'id' | 'user_id' | 'created_at' | 'date'>, returnRef?: boolean) => Promise<{ id: string } | void>;
  updateLoan: (loanId: string, loanData: Partial<Omit<Loan, 'id' | 'user_id'>>) => Promise<void>;
  deleteLoan: (loanId: string) => Promise<void>;
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

  currency: string;
  setCurrency: (currency: string) => void;
  isLoading: boolean;
  triggerSync: (projectId: string) => Promise<void>;
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
  const currencyKey = useLocalStorageKey('currency');

  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [activeProject, _setActiveProject] = useState<Project | null>(ALL_BUSINESS_PROJECT);
  const [defaultProject, _setDefaultProject] = useState<Project | null>(ALL_BUSINESS_PROJECT);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [allBankAccounts, setAllBankAccounts] = useState<BankAccount[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [allCredentials, setAllCredentials] = useState<Credential[]>([]);
  const [allLoans, setAllLoans] = useState<Loan[]>([]);
  
  const [currency, setCurrencyState] = useState<string>('INR');
  const [isLoading, setIsLoading] = useState(true);

  // Use refs to hold the latest state for use in callbacks that don't re-render
  const stateRef = useRef({
    allProjects,
    allTransactions,
    allLoans,
    allBankAccounts,
    allClients,
    allContacts,
    user,
  });

  useEffect(() => {
    stateRef.current = {
      allProjects,
      allTransactions,
      allLoans,
      allBankAccounts,
      allClients,
      allContacts,
      user,
    };
  }, [allProjects, allTransactions, allLoans, allBankAccounts, allClients, allContacts, user]);

  const fetchData = useCallback(async (userId: string) => {
    setIsLoading(true);
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

      setAllProjects(projects);
      setAllTransactions(transactionsRes.data || []);
      setAllBankAccounts(bankAccountsRes.data || []);
      setAllClients(clientsRes.data || []);
      setAllContacts(contactsRes.data || []);
      setAllCategories(categoriesRes.data || []);
      setAllTasks(tasksRes.data || []);
      setAllCredentials(credentialsRes.data || []);
      setAllLoans(loansRes.data || []);

      if (!bankAccountsRes.data || bankAccountsRes.data.length === 0) {
        const personalProject = projects.find(p => p.name === PERSONAL_PROJECT_NAME);
        const { data: newAccount } = await supabase.from('bank_accounts').insert({ user_id: userId, name: 'Primary Account', balance: 0, is_primary: true, project_id: personalProject?.id }).select().single();
        if (newAccount) setAllBankAccounts([newAccount]);
      }
      
      const currencyToSet = userSettingsRes.data?.currency || 'INR';
      setCurrencyState(currencyToSet);
      if (currencyKey) localStorage.setItem(currencyKey, currencyToSet);

      const dbDefaultProjectId = userSettingsRes.data?.default_project_id;
      const defaultProj = projects.find(p => p.id === dbDefaultProjectId);
      _setDefaultProject(defaultProj || ALL_BUSINESS_PROJECT);

      const storedActiveProject = activeProjectKey ? JSON.parse(localStorage.getItem(activeProjectKey) || 'null') : null;
      let activeProjectToSet: Project | null = defaultProj || ALL_BUSINESS_PROJECT;
      if (storedActiveProject) activeProjectToSet = storedActiveProject;
      
      if (activeProjectToSet && (activeProjectToSet.id === 'all' || projects.some(p => p.id === activeProjectToSet!.id))) {
        _setActiveProject(activeProjectToSet);
      } else {
        _setActiveProject(defaultProj || ALL_BUSINESS_PROJECT);
      }
      
    } catch (error) {
      console.error("Error fetching data from Supabase:", error);
      toast({ variant: 'destructive', title: 'Error fetching data', description: 'Could not load your financial data.' });
    } finally {
      setIsLoading(false);
    }
  }, [toast, currencyKey, activeProjectKey]);
  
  const triggerSync = useCallback(async (projectId: string) => {
    // Wait for the next render cycle to ensure state is updated
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
            readFromSheet: false, // Don't read from sheet on auto-syncs to avoid loops
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
  
  const setDefaultProject = useCallback(async (project: Project | null) => {
    if (!user) return;
    const projectToSet = project === null || project.id === 'all' ? ALL_BUSINESS_PROJECT : project;
    _setDefaultProject(projectToSet);
    
    try {
        const { error } = await supabase.from('user_settings').upsert({ 
            user_id: user.id, 
            default_project_id: projectToSet.id === 'all' ? null : projectToSet.id 
        });
        if (error) throw error;
    } catch (dbError) {
        console.error("Failed to save default project to DB:", dbError);
        toast({ variant: 'destructive', title: 'Error saving setting' });
    }
  }, [user, toast]);

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
    if (!user) throw new Error("User not authenticated");
    
    // This is a simplified cascade delete. For production, you might want to use database-level cascade deletes.
    const tablesToDeleteFrom = ['transactions', 'clients', 'categories', 'tasks', 'credentials', 'loans'];
    for (const table of tablesToDeleteFrom) {
        const { error } = await supabase.from(table).delete().eq('project_id', projectId);
        if (error) {
            console.error(`Error deleting from ${table}:`, error);
            throw error;
        }
    }

    const { error: bankAccountsError } = await supabase.from('bank_accounts').update({ project_id: null }).eq('project_id', projectId);
    if (bankAccountsError) {
      console.error(`Error unlinking from bank_accounts:`, bankAccountsError);
      throw bankAccountsError;
    }
    
    // Now delete the project itself
    const { error: projectError } = await supabase.from('projects').delete().eq('id', projectId);
    if (projectError) {
        console.error("Error deleting project:", projectError);
        throw projectError;
    }
    
    // Optimistically update state
    setAllProjects(prev => prev.filter(p => p.id !== projectId));
    setAllTransactions(prev => prev.filter(t => t.project_id !== projectId));
    setAllClients(prev => prev.filter(c => c.project_id !== projectId));
    setAllCategories(prev => prev.filter(c => c.project_id !== projectId));
    setAllTasks(prev => prev.filter(t => t.project_id !== projectId));
    setAllCredentials(prev => prev.filter(c => c.project_id !== projectId));
    setAllBankAccounts(prev => prev.map(b => b.project_id === projectId ? { ...b, project_id: undefined } : b));
    setAllLoans(prev => prev.filter(l => l.project_id !== projectId));
    
    if (activeProject?.id === projectId) {
        setActiveProject(ALL_BUSINESS_PROJECT);
    }
  };

  const addClient = async (clientData: Omit<Client, 'id' | 'user_id' | 'project_id'>, project_id?: string): Promise<Client> => {
    if (!user) throw new Error("User not authenticated");
    const personalProject = allProjects.find(p => p.name === PERSONAL_PROJECT_NAME);
    const finalProjectId = project_id === personalProject?.id ? project_id : (project_id && project_id !== 'all' ? project_id : personalProject?.id);

    const { data: newClient, error } = await supabase.from('clients').insert({ ...clientData, project_id: finalProjectId, user_id: user.id }).select().single();
    if (error) throw error;
    setAllClients(prev => [...prev, newClient]);
    if (finalProjectId) triggerSync(finalProjectId);
    return newClient;
  };

  const updateClient = async (clientId: string, clientData: Partial<Omit<Client, 'id' | 'user_id'>>) => {
    const { data: updatedClient, error } = await supabase.from('clients').update(clientData).eq('id', clientId).select().single();
    if (error) throw error;
    setAllClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
    if (updatedClient.project_id) triggerSync(updatedClient.project_id);
  };

  const deleteClient = async (clientId: string) => {
    const clientToDelete = allClients.find(c => c.id === clientId);
    const { error } = await supabase.from('clients').delete().eq('id', clientId);
    if (error) throw error;
    setAllClients(prev => prev.filter(c => c.id !== clientId));
    if (clientToDelete?.project_id) triggerSync(clientToDelete.project_id);
  };

  const addContact = async (contactData: Omit<Contact, 'id' | 'user_id'>): Promise<Contact> => {
    if (!user) throw new Error("User not authenticated");

    const { data: newContact, error } = await supabase.from('contacts').insert({ ...contactData, user_id: user.id }).select().single();
    if (error) throw error;
    setAllContacts(prev => [...prev, newContact]);
    return newContact;
  };

  const updateContact = async (contactId: string, contactData: Partial<Omit<Contact, 'id' | 'user_id'>>) => {
    const { data: updatedContact, error } = await supabase.from('contacts').update(contactData).eq('id', contactId).select().single();
    if (error) throw error;
    setAllContacts(prev => prev.map(c => c.id === updatedContact.id ? updatedContact : c));
  };

  const deleteContact = async (contactId: string) => {
    await supabase.from('loans').update({ contact_id: null }).eq('contact_id', contactId);
    const { error } = await supabase.from('contacts').delete().eq('id', contactId);
    if (error) throw error;
    setAllContacts(prev => prev.filter(c => c.id !== contactId));
  };

  const addCategory = async (categoryData: Omit<Category, 'id' | 'user_id' | 'project_id'>, project_id?: string): Promise<Category> => {
    if (!user) throw new Error("User not authenticated");
    const personalProject = allProjects.find(p => p.name === PERSONAL_PROJECT_NAME);
    const finalProjectId = project_id === personalProject?.id ? project_id : (project_id && project_id !== 'all' ? project_id : personalProject?.id);
    const { data: newCategory, error } = await supabase.from('categories').insert({ ...categoryData, project_id: finalProjectId, user_id: user.id }).select().single();
    if (error) throw error;
    setAllCategories(prev => [...prev, newCategory]);
    if (finalProjectId) triggerSync(finalProjectId);
    return newCategory;
  };

  const updateCategory = async (categoryId: string, categoryData: Partial<Omit<Category, 'id' | 'user_id'>>) => {
    const { data: updatedCategory, error } = await supabase.from('categories').update(categoryData).eq('id', categoryId).select().single();
    if (error) throw error;
    setAllCategories(prev => prev.map(c => c.id === updatedCategory.id ? updatedCategory : c));
    if (updatedCategory.project_id) triggerSync(updatedCategory.project_id);
  };
  
  const deleteCategory = async (categoryId: string) => {
    const categoryToDelete = allCategories.find(c => c.id === categoryId);
    const { error } = await supabase.from('categories').delete().eq('id', categoryId);
    if (error) throw error;
    setAllCategories(prev => prev.filter(c => c.id !== categoryId));
    if (categoryToDelete?.project_id) triggerSync(categoryToDelete.project_id);
  };

  const updateAccountBalance = useCallback(async (account_id: string, amount: number, operation: 'add' | 'subtract') => {
      setAllBankAccounts(prevAccounts => {
        const accountToUpdate = prevAccounts.find(acc => acc.id === account_id);
        if (!accountToUpdate) {
            console.error("Account not found for balance update");
            return prevAccounts;
        }
        const newBalance = operation === 'add' ? accountToUpdate.balance + amount : accountToUpdate.balance - amount;
        
        supabase.from('bank_accounts').update({ balance: newBalance }).eq('id', account_id).then(({ error }) => {
            if (error) {
                console.error("Error updating balance in DB:", error);
                // Optionally revert UI change here or show a toast
            }
        });

        return prevAccounts.map(acc => acc.id === account_id ? { ...acc, balance: newBalance } : acc);
      });
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
    
    setAllTransactions(prev => [...prev, newTransaction]);

    if (newTransaction.type === 'income' && newTransaction.account_id) { await updateAccountBalance(newTransaction.account_id, newTransaction.amount, 'add'); } 
    else if (newTransaction.type === 'expense' && newTransaction.account_id) { await updateAccountBalance(newTransaction.account_id, newTransaction.amount, 'subtract'); } 
    else if (newTransaction.type === 'transfer' && newTransaction.from_account_id && newTransaction.to_account_id) {
        await updateAccountBalance(newTransaction.from_account_id, newTransaction.amount, 'subtract');
        await updateAccountBalance(newTransaction.to_account_id, newTransaction.amount, 'add');
    } else if (newTransaction.type === 'repayment' && newTransaction.loan_id && newTransaction.account_id) {
      const relatedLoan = allLoans.find(l => l.id === newTransaction.loan_id);
      if (relatedLoan?.type === 'loanGiven') {
        // Money is coming back in
        await updateAccountBalance(newTransaction.account_id, newTransaction.amount, 'add');
      } else { // loanTaken
        // Money is going out
        await updateAccountBalance(newTransaction.account_id, newTransaction.amount, 'subtract');
      }
    }
    if (newTransaction.project_id) triggerSync(newTransaction.project_id);
    if (returnRef) { return { id: newTransaction.id }; }
  };

  const updateTransaction = async (transactionId: string, updatedData: Partial<Transaction>) => {
    const originalTransaction = allTransactions.find(t => t.id === transactionId);
    if (!originalTransaction) return;
    
    // Revert old balance change
    const originalAccountId = originalTransaction.account_id || (originalTransaction.type === 'transfer' ? originalTransaction.from_account_id : undefined);
    if (originalAccountId) {
        if (originalTransaction.type === 'income') await updateAccountBalance(originalAccountId, originalTransaction.amount, 'subtract');
        else if (originalTransaction.type === 'expense') await updateAccountBalance(originalAccountId, originalTransaction.amount, 'add');
        else if (originalTransaction.type === 'transfer' && originalTransaction.to_account_id) {
            await updateAccountBalance(originalAccountId, originalTransaction.amount, 'add');
            await updateAccountBalance(originalTransaction.to_account_id, originalTransaction.amount, 'subtract');
        }
    }
    
    const { data: updatedTransaction, error } = await supabase.from('transactions').update(updatedData).eq('id', transactionId).select().single();
    if (error) {
        // Re-apply old balance if update fails
        if (originalAccountId) {
            if (originalTransaction.type === 'income') await updateAccountBalance(originalAccountId, originalTransaction.amount, 'add');
            else if (originalTransaction.type === 'expense') await updateAccountBalance(originalAccountId, originalTransaction.amount, 'subtract');
        }
        throw error;
    }
    
    setAllTransactions(prev => prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t));

    // Apply new balance change
    const newAccountId = updatedTransaction.account_id || (updatedTransaction.type === 'transfer' ? updatedTransaction.from_account_id : undefined);
    if (newAccountId) {
        if (updatedTransaction.type === 'income') await updateAccountBalance(newAccountId, updatedTransaction.amount, 'add');
        else if (updatedTransaction.type === 'expense') await updateAccountBalance(newAccountId, updatedTransaction.amount, 'subtract');
        else if (updatedTransaction.type === 'transfer' && updatedTransaction.to_account_id) {
            await updateAccountBalance(newAccountId, updatedTransaction.amount, 'subtract');
            await updateAccountBalance(updatedTransaction.to_account_id, updatedTransaction.amount, 'add');
        }
    }
    if (updatedTransaction.project_id) triggerSync(updatedTransaction.project_id);
  };

  const deleteTransaction = async (transactionToDelete: Transaction) => {
    if (transactionToDelete.account_id) {
        if (transactionToDelete.type === 'income') { await updateAccountBalance(transactionToDelete.account_id, transactionToDelete.amount, 'subtract'); } 
        else if (transactionToDelete.type === 'expense') { await updateAccountBalance(transactionToDelete.account_id, transactionToDelete.amount, 'add'); }
    } else if (transactionToDelete.type === 'transfer' && transactionToDelete.from_account_id && transactionToDelete.to_account_id) {
        await updateAccountBalance(transactionToDelete.from_account_id, transactionToDelete.amount, 'add');
        await updateAccountBalance(transactionToDelete.to_account_id, transactionToDelete.amount, 'subtract');
    }
    const { error } = await supabase.from('transactions').delete().eq('id', transactionToDelete.id);
    if (error) throw error;
    setAllTransactions(prev => prev.filter(t => t.id !== transactionToDelete.id));
    if (transactionToDelete.project_id) triggerSync(transactionToDelete.project_id);
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
    
    // Check if loan is fully paid
    const totalRepaid = allTransactions
        .filter(t => t.loan_id === loan.id && t.type === 'repayment')
        .reduce((sum, t) => sum + t.amount, 0) + amount;
        
    if (totalRepaid >= loan.amount) {
        await updateLoan(loan.id, { status: 'paid' });
    }
    if (returnRef) return newDocRef;
  };

  const addBankAccount = async (account: Omit<BankAccount, 'id' | 'user_id' | 'is_primary'>, project_id?: string) => {
    if (!user) return;
    const personalProject = allProjects.find(p => p.name === PERSONAL_PROJECT_NAME);
    const finalProjectId = project_id === personalProject?.id ? project_id : (project_id && project_id !== 'all' ? project_id : personalProject?.id);

    const { data: newAccount, error } = await supabase.from('bank_accounts').insert({ ...account, user_id: user.id, project_id: finalProjectId, is_primary: allBankAccounts.length === 0 }).select().single();
    if (error) throw error;
    setAllBankAccounts(prev => [...prev, newAccount]);
    if (finalProjectId) triggerSync(finalProjectId);
  };

  const updateBankAccount = async (accountId: string, accountData: Partial<Omit<BankAccount, 'id' | 'user_id'>>) => {
    const { data: updatedAccount, error } = await supabase.from('bank_accounts').update(accountData).eq('id', accountId).select().single();
    if (error) throw error;
    setAllBankAccounts(prev => prev.map(acc => acc.id === updatedAccount.id ? updatedAccount : acc));
     if (updatedAccount.project_id) triggerSync(updatedAccount.project_id);
  };
  
  const linkBankAccount = async (accountId: string, projectId: string) => {
    const { data: updatedAccount, error } = await supabase.from('bank_accounts').update({ project_id: projectId }).eq('id', accountId).select().single();
    if (error) throw error;
    setAllBankAccounts(prev => prev.map(acc => acc.id === updatedAccount.id ? updatedAccount : acc));
    if (updatedAccount.project_id) triggerSync(updatedAccount.project_id);
  };

  const deleteBankAccount = async (accountId: string) => {
    await supabase.from('transactions').update({ account_id: null }).eq('account_id', accountId);
    await supabase.from('transactions').update({ from_account_id: null }).eq('from_account_id', accountId);
    await supabase.from('transactions').update({ to_account_id: null }).eq('to_account_id', accountId);
    await supabase.from('loans').update({ account_id: null }).eq('account_id', accountId);

    const accountToDelete = allBankAccounts.find(b => b.id === accountId);
    const { error } = await supabase.from('bank_accounts').delete().eq('id', accountId);
    if (error) throw error;
    
    setAllBankAccounts(prev => prev.filter(b => b.id !== accountId));
    if (accountToDelete?.project_id) triggerSync(accountToDelete.project_id);
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
  const getLoanById = useCallback((id: string) => allLoans.find(l => l.id === id), [allLoans]);

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
  
  const addLoan = async (loanData: Omit<Loan, 'id' | 'user_id' | 'created_at' | 'date'>, returnRef = false): Promise<{ id: string } | void> => {
    if (!user) throw new Error("User not authenticated");
    const personalProject = allProjects.find(p => p.name === PERSONAL_PROJECT_NAME);
    const finalProjectId = loanData.project_id || personalProject?.id;
    
    const dbLoan = {
      ...loanData,
      date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      project_id: finalProjectId, 
      user_id: user.id,
    };
    
    const { data: newLoan, error } = await supabase.from('loans').insert(dbLoan).select().single();
    if (error) throw error;

    if (newLoan.type === 'loanTaken') {
        await updateAccountBalance(newLoan.account_id, newLoan.amount, 'add');
    } else { // loanGiven
        await updateAccountBalance(newLoan.account_id, newLoan.amount, 'subtract');
    }

    setAllLoans(prev => [...prev, newLoan]);
    if (finalProjectId) triggerSync(finalProjectId);
    if (returnRef) return { id: newLoan.id };
  };

  const updateLoan = async (loanId: string, loanData: Partial<Omit<Loan, 'id' | 'user_id'>>) => {
    const originalLoan = allLoans.find(l => l.id === loanId);
    if (!originalLoan) return;

    if (!loanData.amount || loanData.amount === originalLoan.amount) {
      // If amount hasn't changed, just update other details
      const { data: updatedLoan, error } = await supabase.from('loans').update(loanData).eq('id', loanId).select().single();
      if (error) throw error;
      setAllLoans(prev => prev.map(l => l.id === updatedLoan.id ? updatedLoan : l));
      if (updatedLoan.project_id) triggerSync(updatedLoan.project_id);
      return;
    }


    // Revert old balance change
    if (originalLoan.type === 'loanTaken') {
        await updateAccountBalance(originalLoan.account_id, originalLoan.amount, 'subtract');
    } else {
        await updateAccountBalance(originalLoan.account_id, originalLoan.amount, 'add');
    }

    const { data: updatedLoan, error } = await supabase.from('loans').update(loanData).eq('id', loanId).select().single();
    if (error) { // If update fails, revert the balance reversion
         if (originalLoan.type === 'loanTaken') {
            await updateAccountBalance(originalLoan.account_id, originalLoan.amount, 'add');
        } else {
            await updateAccountBalance(originalLoan.account_id, originalLoan.amount, 'subtract');
        }
        throw error;
    }
    
    // Apply new balance change
    if (updatedLoan.type === 'loanTaken') {
        await updateAccountBalance(updatedLoan.account_id, updatedLoan.amount, 'add');
    } else {
        await updateAccountBalance(updatedLoan.account_id, updatedLoan.amount, 'subtract');
    }

    setAllLoans(prev => prev.map(l => l.id === updatedLoan.id ? updatedLoan : l));
    if (updatedLoan.project_id) triggerSync(updatedLoan.project_id);
  };

  const deleteLoan = async (loanId: string) => {
    const loanToDelete = allLoans.find(l => l.id === loanId);
    if (!loanToDelete) return;

    const { error } = await supabase.from('loans').delete().eq('id', loanId);
    if (error) throw error;
    
    // Revert balance change
    if (loanToDelete.type === 'loanTaken') {
        await updateAccountBalance(loanToDelete.account_id, loanToDelete.amount, 'subtract');
    } else { // loanGiven
        await updateAccountBalance(loanToDelete.account_id, loanToDelete.amount, 'add');
    }
    
    setAllLoans(prev => prev.filter(l => l.id !== loanId));
    if (loanToDelete.project_id) triggerSync(loanToDelete.project_id);
  };

  const filteredTransactions = useMemo(() => {
    const personalProject = allProjects.find(p => p.name === PERSONAL_PROJECT_NAME);
    return (activeProject && activeProject.id !== 'all') 
      ? allTransactions.filter(t => t.project_id === activeProject.id) 
      : allTransactions.filter(t => t.project_id === personalProject?.id || !t.project_id);
  }, [allTransactions, activeProject, allProjects]);

  const filteredClients = useMemo(() => {
    const personalProject = allProjects.find(p => p.name === PERSONAL_PROJECT_NAME);
      if (activeProject && activeProject.id !== 'all') {
        return allClients.filter(c => c.project_id === activeProject.id);
      }
      return allClients.filter(c => c.project_id === personalProject?.id || !c.project_id);
  }, [allClients, activeProject, allProjects]);

  const filteredContacts = useMemo(() => {
    return allContacts;
  }, [allContacts]);

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
  
  const filteredLoans = useMemo(() => {
    const personalProject = allProjects.find(p => p.name === PERSONAL_PROJECT_NAME);
    if (activeProject && activeProject.id !== 'all') {
      return allLoans.filter(l => l.project_id === activeProject.id);
    }
    return allLoans.filter(l => l.project_id === personalProject?.id || !l.project_id);
  }, [allLoans, activeProject, allProjects]);


  const contextValue: FinancialContextType = useMemo(() => ({
    projects: allProjects, activeProject, setActiveProject, defaultProject, setDefaultProject, addProject, updateProject, deleteProject,
    transactions: filteredTransactions, allTransactions, addTransaction, updateTransaction, deleteTransaction, getTransactionById, addRepayment,
    bankAccounts: filteredBankAccounts, allBankAccounts, addBankAccount, updateBankAccount, deleteBankAccount, setPrimaryBankAccount, linkBankAccount,
    clients: filteredClients, allClients, addClient, updateClient, deleteClient,
    contacts: filteredContacts, allContacts, addContact, updateContact, deleteContact,
    categories: filteredCategories, addCategory, updateCategory, deleteCategory,
    tasks: filteredTasks, addTask, updateTask, deleteTask,
    credentials: filteredCredentials, addCredential, updateCredential, deleteCredential,
    loans: filteredLoans, allLoans, addLoan, updateLoan, deleteLoan, getLoanById,
    currency, setCurrency,
    isLoading: isLoading || isUserLoading,
    triggerSync,
  }), [
      allProjects, activeProject, defaultProject, filteredTransactions, allTransactions, filteredBankAccounts, allBankAccounts, filteredClients, allClients, filteredContacts, allContacts, filteredCategories, allTasks, allTasks, filteredCredentials, allCredentials, filteredLoans, allLoans, currency, isLoading, isUserLoading,
      setActiveProject, setDefaultProject, addProject, updateProject, deleteProject,
      addTransaction, updateTransaction, deleteTransaction, getTransactionById, addRepayment,
      addBankAccount, updateBankAccount, deleteBankAccount, setPrimaryBankAccount, linkBankAccount,
      addClient, updateClient, deleteClient,
      addContact, updateContact, deleteContact,
      addCategory, updateCategory, deleteCategory,
      addTask, updateTask, deleteTask,
      addCredential, updateCredential, deleteCredential,
      addLoan, updateLoan, deleteLoan, getLoanById,
      setCurrency,
      triggerSync
    ]);

  return (
    <FinancialContext.Provider value={contextValue}>
      {children}
    </FinancialContext.Provider>
  );
}
