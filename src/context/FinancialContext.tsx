'use client';

import { createContext, useCallback, ReactNode, useMemo, useState, useEffect } from 'react';
import type { Transaction, Debt, BankAccount, UserSettings, Project, Client, Category, Task, Hobby, Credential } from '@/lib/types';
import { useUser } from '@/firebase';

interface FinancialContextType {
  projects: Project[];
  activeProject: Project | null;
  setActiveProject: (project: Project | null) => void;
  defaultProject: Project | null;
  setDefaultProject: (project: Project | null) => void;
  addProject: (projectData: Omit<Project, 'id' | 'userId' | 'createdAt'>) => void;
  updateProject: (projectId: string, projectData: Partial<Omit<Project, 'id' | 'userId' | 'createdAt'>>) => void;
  deleteProject: (projectId: string) => void;
  
  transactions: Transaction[];
  allTransactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'date' | 'userId'>, returnRef?: boolean) => Promise<{ id: string } | void>;
  updateTransaction: (originalTransaction: Transaction, updatedData: Partial<Transaction>) => void;
  deleteTransaction: (transaction: Transaction) => void;
  getTransactionById: (id: string) => Transaction | undefined;
  
  debts: Debt[];
  addDebt: (debt: Omit<Debt, 'id' | 'date' | 'userId'>, returnRef?: boolean) => Promise<{ id: string } | void>;
  updateDebt: (originalDebt: Debt, updatedData: Partial<Debt>) => void;
  deleteDebt: (debt: Debt) => void;
  addRepayment: (debt: Debt, amount: number, accountId: string) => void;
  getDebtById: (id: string) => Debt | undefined;

  bankAccounts: BankAccount[];
  addBankAccount: (account: Omit<BankAccount, 'id' | 'userId'>) => void;
  updateBankAccount: (accountId: string, accountData: Partial<Omit<BankAccount, 'id' | 'userId'>>) => void;
  deleteBankAccount: (accountId: string) => void;
  setPrimaryBankAccount: (accountId: string) => void;
  
  clients: Client[];
  addClient: (clientData: Omit<Client, 'id' | 'projectId'>, projectId?: string) => Client;
  updateClient: (clientId: string, clientData: Partial<Omit<Client, 'id' | 'projectId'>>) => void;
  deleteClient: (clientId: string) => void;

  categories: Category[];
  addCategory: (categoryData: Omit<Category, 'id' | 'projectId'>, projectId?: string) => void;
  updateCategory: (categoryId: string, categoryData: Partial<Omit<Category, 'id' | 'projectId'>>) => void;
  deleteCategory: (categoryId: string) => void;
  
  tasks: Task[];
  addTask: (taskData: Omit<Task, 'id' | 'userId' | 'createdAt'>) => void;
  updateTask: (taskId: string, taskData: Partial<Omit<Task, 'id' | 'userId' | 'createdAt'>>) => void;
  deleteTask: (taskId: string) => void;
  
  hobbies: Hobby[];
  addHobby: (hobbyData: Omit<Hobby, 'id' | 'userId' | 'createdAt'>) => void;
  updateHobby: (hobbyId: string, hobbyData: Partial<Omit<Hobby, 'id' | 'userId' | 'createdAt'>>) => void;
  deleteHobby: (hobbyId: string) => void;
  
  credentials: Credential[];
  addCredential: (credentialData: Omit<Credential, 'id' | 'userId' | 'createdAt'>) => void;
  updateCredential: (credentialId: string, credentialData: Partial<Omit<Credential, 'id' | 'userId' | 'createdAt'>>) => void;
  deleteCredential: (credentialId: string) => void;

  currency: string;
  setCurrency: (currency: string) => void;
  isLoading: boolean;
}

export const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

// Hook to get a key for local storage, scoped to the user
const useLocalStorageKey = (key: string) => {
  const { user } = useUser();
  return user ? `financeflow_${user.uid}_${key}` : null;
};

const ALL_BUSINESS_PROJECT: Project = { id: 'all', name: 'All Business', userId: '', createdAt: new Date().toISOString() };


export function FinancialProvider({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();

  // Keys for local storage
  const projectsKey = useLocalStorageKey('projects');
  const activeProjectKey = useLocalStorageKey('activeProject');
  const defaultProjectKey = useLocalStorageKey('defaultProject');
  const transactionsKey = useLocalStorageKey('transactions');
  const debtsKey = useLocalStorageKey('debts');
  const bankAccountsKey = useLocalStorageKey('bankAccounts');
  const currencyKey = useLocalStorageKey('currency');
  const clientsKey = useLocalStorageKey('clients');
  const categoriesKey = useLocalStorageKey('categories');
  const tasksKey = useLocalStorageKey('tasks');
  const hobbiesKey = useLocalStorageKey('hobbies');
  const credentialsKey = useLocalStorageKey('credentials');


  // State management for all data
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [activeProject, _setActiveProject] = useState<Project | null>(ALL_BUSINESS_PROJECT);
  const [defaultProject, _setDefaultProject] = useState<Project | null>(ALL_BUSINESS_PROJECT);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [allDebts, setAllDebts] = useState<Debt[]>([]);
  const [allBankAccounts, setAllBankAccounts] = useState<BankAccount[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [allHobbies, setAllHobbies] = useState<Hobby[]>([]);
  const [allCredentials, setAllCredentials] = useState<Credential[]>([]);
  
  const [currency, setCurrencyState] = useState<string>('INR');
  const [isLoading, setIsLoading] = useState(true);

  // Read from local storage on mount and when user changes
  useEffect(() => {
    if (!user || !projectsKey) {
      setIsLoading(!isUserLoading);
      return;
    };
    setIsLoading(true);

    try {
      const storedProjectsJSON = localStorage.getItem(projectsKey);
      const firstTimeUser = storedProjectsJSON === null;

      if (firstTimeUser) {
        // Create default data for a new user
        const defaultAccountId = crypto.randomUUID();
        const defaultAccount: BankAccount = { id: defaultAccountId, userId: user.uid, name: 'Primary Account', balance: 0, isPrimary: true };
        
        setAllBankAccounts([defaultAccount]);
        
        setAllProjects([]);
        _setActiveProject(ALL_BUSINESS_PROJECT);
        _setDefaultProject(ALL_BUSINESS_PROJECT);
        setAllTransactions([]);
        setAllDebts([]);
        setAllClients([]);
        setAllCategories([]);
        setAllTasks([]);
        setAllHobbies([]);
        setAllCredentials([]);
        setCurrencyState('INR');

      } else {
        // Load existing user data
        const storedProjects = storedProjectsJSON ? JSON.parse(storedProjectsJSON) : [];
        const storedDefaultProject = defaultProjectKey ? JSON.parse(localStorage.getItem(defaultProjectKey) || 'null') : null;
        let activeProjectToSet = storedDefaultProject;

        const storedActiveProject = activeProjectKey ? JSON.parse(localStorage.getItem(activeProjectKey) || 'null') : null;
        if (storedActiveProject) {
          activeProjectToSet = storedActiveProject;
        }
        
        const storedTransactions = transactionsKey ? JSON.parse(localStorage.getItem(transactionsKey) || '[]') : [];
        const storedDebts = debtsKey ? JSON.parse(localStorage.getItem(debtsKey) || '[]') : [];
        const storedBankAccounts = bankAccountsKey ? JSON.parse(localStorage.getItem(bankAccountsKey) || '[]') : [];
        const storedCurrency = currencyKey ? localStorage.getItem(currencyKey) || 'INR' : 'INR';
        const storedClients = clientsKey ? JSON.parse(localStorage.getItem(clientsKey) || '[]') : [];
        const storedCategories = categoriesKey ? JSON.parse(localStorage.getItem(categoriesKey) || '[]') : [];
        const storedTasks = tasksKey ? JSON.parse(localStorage.getItem(tasksKey) || '[]') : [];
        const storedHobbies = hobbiesKey ? JSON.parse(localStorage.getItem(hobbiesKey) || '[]') : [];
        const storedCredentials = credentialsKey ? JSON.parse(localStorage.getItem(credentialsKey) || '[]') : [];
        
        setAllProjects(storedProjects);
        
        if (activeProjectToSet && (activeProjectToSet.id === 'all' || storedProjects.some((p: Project) => p.id === activeProjectToSet.id))) {
          _setActiveProject(activeProjectToSet);
        } else {
          _setActiveProject(ALL_BUSINESS_PROJECT);
        }
         if (storedDefaultProject && (storedDefaultProject.id === 'all' || storedProjects.some((p: Project) => p.id === storedDefaultProject.id))) {
          _setDefaultProject(storedDefaultProject);
        } else {
          _setDefaultProject(ALL_BUSINESS_PROJECT);
        }

        setAllTransactions(storedTransactions);
        setAllDebts(storedDebts);
        setAllBankAccounts(storedBankAccounts);
        setAllClients(storedClients);
        setAllCategories(storedCategories);
        setAllTasks(storedTasks);
        setAllHobbies(storedHobbies);
        setAllCredentials(storedCredentials);
        setCurrencyState(storedCurrency);
      }
    } catch (error) {
      console.error("Failed to parse from local storage", error);
      // Initialize with empty/default values if parsing fails
      setAllProjects([]);
      _setActiveProject(ALL_BUSINESS_PROJECT);
      _setDefaultProject(ALL_BUSINESS_PROJECT);
      setAllTransactions([]);
      setAllDebts([]);
      setAllBankAccounts([]);
      setAllClients([]);
      setAllCategories([]);
      setAllTasks([]);
      setAllHobbies([]);
      setAllCredentials([]);
      setCurrencyState('INR');
    } finally {
      setIsLoading(false);
    }
  }, [user, isUserLoading, projectsKey, activeProjectKey, defaultProjectKey, transactionsKey, debtsKey, bankAccountsKey, currencyKey, clientsKey, categoriesKey, tasksKey, hobbiesKey, credentialsKey]);

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

  // Write to local storage whenever state changes
  useEffect(() => { if (projectsKey) localStorage.setItem(projectsKey, JSON.stringify(allProjects)); }, [allProjects, projectsKey]);
  useEffect(() => { if (transactionsKey) localStorage.setItem(transactionsKey, JSON.stringify(allTransactions)); }, [allTransactions, transactionsKey]);
  useEffect(() => { if (debtsKey) localStorage.setItem(debtsKey, JSON.stringify(allDebts)); }, [allDebts, debtsKey]);
  useEffect(() => { if (bankAccountsKey) localStorage.setItem(bankAccountsKey, JSON.stringify(allBankAccounts)); }, [allBankAccounts, bankAccountsKey]);
  useEffect(() => { if (currencyKey) localStorage.setItem(currencyKey, currency); }, [currency, currencyKey]);
  useEffect(() => { if (clientsKey) localStorage.setItem(clientsKey, JSON.stringify(allClients)); }, [allClients, clientsKey]);
  useEffect(() => { if (categoriesKey) localStorage.setItem(categoriesKey, JSON.stringify(allCategories)); }, [allCategories, categoriesKey]);
  useEffect(() => { if (tasksKey) localStorage.setItem(tasksKey, JSON.stringify(allTasks)); }, [allTasks, tasksKey]);
  useEffect(() => { if (hobbiesKey) localStorage.setItem(hobbiesKey, JSON.stringify(allHobbies)); }, [allHobbies, hobbiesKey]);
  useEffect(() => { if (credentialsKey) localStorage.setItem(credentialsKey, JSON.stringify(allCredentials)); }, [allCredentials, credentialsKey]);

  // Data manipulation functions
  const addProject = useCallback((projectData: Omit<Project, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;
    const newProject = { ...projectData, id: crypto.randomUUID(), userId: user.uid, createdAt: new Date().toISOString() };
    setAllProjects(prev => [...prev, newProject]);
    if (activeProject?.id === 'all') { 
        setActiveProject(newProject); 
    }
  }, [user, activeProject, setActiveProject]);

  const updateProject = useCallback((projectId: string, projectData: Partial<Omit<Project, 'id' | 'userId' | 'createdAt'>>) => {
    setAllProjects(prev => prev.map(p => p.id === projectId ? { ...p, ...projectData } : p));
  }, []);

  const deleteProject = useCallback((projectId: string) => {
    setAllProjects(prev => prev.filter(p => p.id !== projectId));
    setAllTransactions(prev => prev.filter(t => t.projectId !== projectId));
    setAllDebts(prev => prev.filter(d => d.projectId !== projectId));
    setAllClients(prev => prev.filter(c => c.projectId !== projectId));
    setAllCategories(prev => prev.filter(cat => cat.projectId !== projectId));
    setAllTasks(prev => prev.filter(t => t.projectId !== projectId));
    if (activeProject?.id === projectId) {
      setActiveProject(ALL_BUSINESS_PROJECT);
    }
  }, [activeProject, setActiveProject]);

  const addClient = useCallback((clientData: Omit<Client, 'id' | 'projectId'>, projectId?: string): Client => {
    if (!user) {
        const fallbackClient = { ...clientData, id: crypto.randomUUID(), projectId: projectId || '' };
        setAllClients(prev => [...prev, fallbackClient]);
        return fallbackClient;
    }
    const newClient = { ...clientData, id: crypto.randomUUID(), projectId: projectId || (activeProject && activeProject.id !== 'all' ? activeProject.id : '') || '' };
    setAllClients(prev => [...prev, newClient]);
    return newClient;
}, [user, activeProject]);

  const updateClient = useCallback((clientId: string, clientData: Partial<Omit<Client, 'id' | 'projectId'>>) => {
    setAllClients(prev => prev.map(c => c.id === clientId ? { ...c, ...clientData } : c));
  }, []);

  const deleteClient = useCallback((clientId: string) => {
    setAllClients(prev => prev.filter(c => c.id !== clientId));
  }, []);

  const addCategory = useCallback((categoryData: Omit<Category, 'id' | 'projectId'>, projectId?: string) => {
    if (!user) return;
    const finalProjectId = projectId || (activeProject && activeProject.id !== 'all' ? activeProject.id : '') || '';
    const newCategory = { ...categoryData, id: crypto.randomUUID(), projectId: finalProjectId };
    setAllCategories(prev => [...prev, newCategory]);
  }, [user, activeProject]);

  const updateCategory = useCallback((categoryId: string, categoryData: Partial<Omit<Category, 'id' | 'projectId'>>) => {
    setAllCategories(prev => prev.map(c => c.id === categoryId ? { ...c, ...categoryData } : c));
  }, []);
  
  const deleteCategory = useCallback((categoryId: string) => {
    setAllCategories(prev => prev.filter(c => c.id !== categoryId));
  }, []);

  const updateAccountBalance = useCallback((accountId: string, amount: number, operation: 'add' | 'subtract') => {
      setAllBankAccounts(prevAccounts => 
        prevAccounts.map(acc => {
          if (acc.id === accountId) {
            return { ...acc, balance: operation === 'add' ? acc.balance + amount : acc.balance - amount };
          }
          return acc;
        })
      );
  }, []);

  const addTransaction = useCallback(async (transactionData: Omit<Transaction, 'id'| 'date' | 'userId'>, returnRef = false): Promise<{ id: string } | void> => {
    if (!user) return;
    
    const newTransaction = { ...transactionData, id: crypto.randomUUID(), userId: user.uid, date: new Date().toISOString() };
    
    setAllTransactions(prev => [...prev, newTransaction]);
    
    if (newTransaction.type === 'income' && newTransaction.accountId) { updateAccountBalance(newTransaction.accountId, newTransaction.amount, 'add'); } 
    else if (newTransaction.type === 'expense' && newTransaction.accountId) { updateAccountBalance(newTransaction.accountId, newTransaction.amount, 'subtract'); } 
    else if (newTransaction.type === 'transfer' && newTransaction.fromAccountId && newTransaction.toAccountId) {
        updateAccountBalance(newTransaction.fromAccountId, newTransaction.amount, 'subtract');
        updateAccountBalance(newTransaction.toAccountId, newTransaction.amount, 'add');
    }
    if (returnRef) { return { id: newTransaction.id }; }
  }, [user, updateAccountBalance]);

  const updateTransaction = useCallback((originalTransaction: Transaction, updatedData: Partial<Transaction>) => {
    if (originalTransaction.accountId) {
      if (originalTransaction.type === 'income') updateAccountBalance(originalTransaction.accountId, originalTransaction.amount, 'subtract');
      if (originalTransaction.type === 'expense') updateAccountBalance(originalTransaction.accountId, originalTransaction.amount, 'add');
    }
    const finalTransaction = { ...originalTransaction, ...updatedData };
    if (finalTransaction.accountId) {
        if (finalTransaction.type === 'income') updateAccountBalance(finalTransaction.accountId, finalTransaction.amount, 'add');
        if (finalTransaction.type === 'expense') updateAccountBalance(finalTransaction.accountId, finalTransaction.amount, 'subtract');
    }
    setAllTransactions(prev => prev.map(t => (t.id === originalTransaction.id ? finalTransaction : t)));
  }, [updateAccountBalance]);

  const deleteTransaction = useCallback((transactionToDelete: Transaction) => {
     if (transactionToDelete.accountId) {
        if (transactionToDelete.type === 'income') { updateAccountBalance(transactionToDelete.accountId, transactionToDelete.amount, 'subtract'); } 
        else if (transactionToDelete.type === 'expense') { updateAccountBalance(transactionToDelete.accountId, transactionToDelete.amount, 'add'); }
    }
    setAllTransactions(prev => prev.filter(t => t.id !== transactionToDelete.id));
  }, [updateAccountBalance]);

  const addDebt = useCallback(async (debtData: Omit<Debt, 'id' | 'date' | 'userId'>, returnRef = false): Promise<{ id: string } | void> => {
    if (!user || !debtData.accountId) return;
    const newDebt = { ...debtData, id: crypto.randomUUID(), userId: user.uid, date: new Date().toISOString() };
    setAllDebts(prev => [...prev, newDebt]);

    if (newDebt.type === 'creditor') { updateAccountBalance(newDebt.accountId, newDebt.amount, 'add'); } 
    else if (newDebt.type === 'debtor') { updateAccountBalance(newDebt.accountId, newDebt.amount, 'subtract'); }
    if (returnRef) { return { id: newDebt.id }; }
  }, [user, updateAccountBalance]);

  const updateDebt = useCallback((originalDebt: Debt, updatedData: Partial<Debt>) => {
    const amountDifference = (updatedData.amount ?? originalDebt.amount) - originalDebt.amount;
    if (amountDifference !== 0 && originalDebt.accountId) {
        if (originalDebt.type === 'creditor') { updateAccountBalance(originalDebt.accountId, amountDifference, 'add'); } 
        else { updateAccountBalance(originalDebt.accountId, amountDifference, 'subtract'); }
    }
    setAllDebts(prev => prev.map(d => (d.id === originalDebt.id ? { ...d, ...updatedData } : d)));
  }, [updateAccountBalance]);

  const deleteDebt = useCallback((debtToDelete: Debt) => {
    if (debtToDelete.accountId) {
        if (debtToDelete.type === 'creditor') { updateAccountBalance(debtToDelete.accountId, debtToDelete.amount, 'subtract'); } 
        else { updateAccountBalance(debtToDelete.accountId, debtToDelete.amount, 'add'); }
    }
    setAllDebts(prev => prev.filter(d => d.id !== debtToDelete.id));
  }, [updateAccountBalance]);

  const addRepayment = useCallback((debt: Debt, amount: number, accountId: string) => {
    updateDebt(debt, { amount: debt.amount - amount });
    addTransaction({ type: 'repayment', amount, category: 'Debt Repayment', description: `Payment for debt: ${debt.name}`, debtId: debt.id, accountId: accountId, projectId: debt.projectId });
  }, [addTransaction, updateDebt]);

  const addBankAccount = useCallback((account: Omit<BankAccount, 'id' | 'userId'>) => {
    if (!user) return;
    const newAccount = { ...account, id: crypto.randomUUID(), userId: user.uid, isPrimary: allBankAccounts.length === 0 };
    setAllBankAccounts(prev => [...prev, newAccount]);
  }, [user, allBankAccounts]);

  const updateBankAccount = useCallback((accountId: string, accountData: Partial<Omit<BankAccount, 'id' | 'userId'>>) => {
    setAllBankAccounts(prev => prev.map(acc => acc.id === accountId ? { ...acc, ...accountData } : acc));
  }, []);

  const deleteBankAccount = useCallback((accountId: string) => {
    setAllBankAccounts(prev => prev.filter(acc => acc.id !== accountId));
  }, []);

  const setCurrency = useCallback((newCurrency: string) => { setCurrencyState(newCurrency); }, []);

  const setPrimaryBankAccount = useCallback((accountId: string) => {
    setAllBankAccounts(prev => prev.map(acc => ({ ...acc, isPrimary: acc.id === accountId })));
  }, []);

  const getTransactionById = useCallback((id: string) => {
      return allTransactions.find(t => t.id === id);
  }, [allTransactions]);

  const getDebtById = useCallback((id: string) => {
      return allDebts.find(d => d.id === id);
  }, [allDebts]);

    const addTask = useCallback((taskData: Omit<Task, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;
    const newTask = { ...taskData, id: crypto.randomUUID(), userId: user.uid, createdAt: new Date().toISOString() };
    setAllTasks(prev => [...prev, newTask]);
  }, [user]);

  const updateTask = useCallback((taskId: string, taskData: Partial<Omit<Task, 'id' | 'userId' | 'createdAt'>>) => {
    setAllTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...taskData } : t));
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setAllTasks(prev => prev.filter(t => t.id !== taskId));
  }, []);
  
  const addHobby = useCallback((hobbyData: Omit<Hobby, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;
    const newHobby = { ...hobbyData, id: crypto.randomUUID(), userId: user.uid, createdAt: new Date().toISOString() };
    setAllHobbies(prev => [...prev, newHobby]);
  }, [user]);

  const updateHobby = useCallback((hobbyId: string, hobbyData: Partial<Omit<Hobby, 'id' | 'userId' | 'createdAt'>>) => {
    setAllHobbies(prev => prev.map(h => h.id === hobbyId ? { ...h, ...hobbyData } : h));
  }, []);
  
  const deleteHobby = useCallback((hobbyId: string) => {
    setAllHobbies(prev => prev.filter(h => h.id !== hobbyId));
  }, []);

  const addCredential = useCallback((credentialData: Omit<Credential, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;
    const newCredential = { ...credentialData, id: crypto.randomUUID(), userId: user.uid, createdAt: new Date().toISOString() };
    setAllCredentials(prev => [...prev, newCredential]);
  }, [user]);

  const updateCredential = useCallback((credentialId: string, credentialData: Partial<Omit<Credential, 'id' | 'userId' | 'createdAt'>>) => {
    setAllCredentials(prev => prev.map(c => c.id === credentialId ? { ...c, ...credentialData } : c));
  }, []);
  
  const deleteCredential = useCallback((credentialId: string) => {
    setAllCredentials(prev => prev.filter(c => c.id !== credentialId));
  }, []);
  
  const filteredTransactions = useMemo(() => (activeProject && activeProject.id !== 'all') ? allTransactions.filter(t => t.projectId === activeProject.id) : allTransactions.filter(t => !t.projectId), [allTransactions, activeProject]);
  const filteredDebts = useMemo(() => (activeProject && activeProject.id !== 'all') ? allDebts.filter(d => d.projectId === activeProject.id) : allDebts.filter(d => !d.projectId), [allDebts, activeProject]);
  const filteredClients = useMemo(() => (activeProject && activeProject.id !== 'all') ? allClients.filter(c => c.projectId === activeProject.id) : allClients.filter(c => !c.projectId), [allClients, activeProject]);
  const filteredCategories = useMemo(() => (activeProject && activeProject.id !== 'all') ? allCategories.filter(c => c.projectId === activeProject.id) : allCategories.filter(c => !c.projectId), [allCategories, activeProject]);
  const filteredTasks = useMemo(() => (activeProject && activeProject.id !== 'all') ? allTasks.filter(t => t.projectId === activeProject.id) : allTasks.filter(t => !t.projectId), [allTasks, activeProject]);


  const contextValue = useMemo(() => ({
    projects: allProjects, activeProject, setActiveProject, defaultProject, setDefaultProject, addProject, updateProject, deleteProject,
    transactions: filteredTransactions, allTransactions: allTransactions, addTransaction, updateTransaction, deleteTransaction, getTransactionById,
    debts: filteredDebts, addDebt, updateDebt, deleteDebt, addRepayment, getDebtById,
    bankAccounts: allBankAccounts, addBankAccount, updateBankAccount, deleteBankAccount, setPrimaryBankAccount,
    clients: filteredClients, addClient, updateClient, deleteClient,
    categories: filteredCategories, addCategory, updateCategory, deleteCategory,
    tasks: filteredTasks, addTask, updateTask, deleteTask,
    hobbies: allHobbies, addHobby, updateHobby, deleteHobby,
    credentials: allCredentials, addCredential, updateCredential, deleteCredential,
    currency, setCurrency,
    isLoading: isLoading,
  }), [
      allProjects, activeProject, setActiveProject, defaultProject, setDefaultProject, addProject, updateProject, deleteProject,
      filteredTransactions, allTransactions, addTransaction, updateTransaction, deleteTransaction, getTransactionById,
      filteredDebts, addDebt, updateDebt, deleteDebt, addRepayment, getDebtById,
      allBankAccounts, addBankAccount, updateBankAccount, deleteBankAccount, setPrimaryBankAccount,
      filteredClients, addClient, updateClient, deleteClient,
      filteredCategories, addCategory, updateCategory, deleteCategory,
      filteredTasks, addTask, updateTask, deleteTask,
      allHobbies, addHobby, updateHobby, deleteHobby,
      allCredentials, addCredential, updateCredential, deleteCredential,
      currency, setCurrency,
      isLoading
    ]);

  return (
    <FinancialContext.Provider value={contextValue}>
      {children}
    </FinancialContext.Provider>
  );
}
