'use client';

import { createContext, useCallback, ReactNode, useMemo, useState, useEffect } from 'react';
import type { Transaction, Debt, BankAccount, UserSettings, Project, Client, Category } from '@/lib/types';
import { useUser } from '@/firebase';

interface FinancialContextType {
  projects: Project[];
  activeProject: Project | null;
  setActiveProject: (project: Project | null) => void;
  addProject: (projectData: Omit<Project, 'id' | 'userId' | 'createdAt'>) => void;
  updateProject: (projectId: string, projectData: Partial<Omit<Project, 'id' | 'userId' | 'createdAt'>>) => void;
  deleteProject: (projectId: string) => void;
  
  transactions: Transaction[];
  allTransactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'date' | 'userId' | 'projectId'>, returnRef?: boolean) => Promise<{ id: string } | void>;
  updateTransaction: (originalTransaction: Transaction, updatedData: Partial<Transaction>) => void;
  deleteTransaction: (transaction: Transaction) => void;
  getTransactionById: (id: string) => Transaction | undefined;
  
  debts: Debt[];
  addDebt: (debt: Omit<Debt, 'id' | 'date' | 'userId' | 'projectId'>, returnRef?: boolean) => Promise<{ id: string } | void>;
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
  addClient: (clientData: Omit<Client, 'id' | 'projectId'>) => void;
  updateClient: (clientId: string, clientData: Partial<Omit<Client, 'id' | 'projectId'>>) => void;
  deleteClient: (clientId: string) => void;

  categories: Category[];
  addCategory: (categoryData: Omit<Category, 'id' | 'projectId'>) => void;
  updateCategory: (categoryId: string, categoryData: Partial<Omit<Category, 'id' | 'projectId'>>) => void;
  deleteCategory: (categoryId: string) => void;
  
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

export function FinancialProvider({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();

  // Keys for local storage
  const projectsKey = useLocalStorageKey('projects');
  const activeProjectKey = useLocalStorageKey('activeProject');
  const transactionsKey = useLocalStorageKey('transactions');
  const debtsKey = useLocalStorageKey('debts');
  const bankAccountsKey = useLocalStorageKey('bankAccounts');
  const currencyKey = useLocalStorageKey('currency');
  const clientsKey = useLocalStorageKey('clients');
  const categoriesKey = useLocalStorageKey('categories');

  // State management
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currency, setCurrencyState] = useState<string>('INR');
  const [isLoading, setIsLoading] = useState(true);

  // Read from local storage on mount and when user changes
  useEffect(() => {
    if (!user) {
      setIsLoading(!isUserLoading);
      return;
    };
    setIsLoading(true);

    try {
      let storedProjects = projectsKey ? JSON.parse(localStorage.getItem(projectsKey) || '[]') : [];
      const storedActiveProject = activeProjectKey ? JSON.parse(localStorage.getItem(activeProjectKey) || 'null') : null;
      const storedTransactions = transactionsKey ? JSON.parse(localStorage.getItem(transactionsKey) || '[]') : [];
      const storedDebts = debtsKey ? JSON.parse(localStorage.getItem(debtsKey) || '[]') : [];
      const storedBankAccounts = bankAccountsKey ? JSON.parse(localStorage.getItem(bankAccountsKey) || '[]') : [];
      const storedCurrency = currencyKey ? localStorage.getItem(currencyKey) || 'INR' : 'INR';
      const storedClients = clientsKey ? JSON.parse(localStorage.getItem(clientsKey) || '[]') : [];
      const storedCategories = categoriesKey ? JSON.parse(localStorage.getItem(categoriesKey) || '[]') : [];
      
      if (storedProjects.length === 0) {
        const defaultProject = { id: crypto.randomUUID(), name: 'All Business', userId: user.uid, createdAt: new Date().toISOString() };
        storedProjects = [defaultProject];
        setProjects(storedProjects);
        setActiveProject(defaultProject);
      } else {
        setProjects(storedProjects);
        if (storedActiveProject && storedProjects.some((p: Project) => p.id === storedActiveProject.id)) {
          setActiveProject(storedActiveProject);
        } else {
          setActiveProject(storedProjects.find(p => p.name === 'All Business') || storedProjects[0]);
        }
      }

      setTransactions(storedTransactions);
      setDebts(storedDebts);
      setBankAccounts(storedBankAccounts);
      setClients(storedClients);
      setCategories(storedCategories);
      setCurrencyState(storedCurrency);

    } catch (error) {
      console.error("Failed to parse from local storage", error);
      // Initialize with empty/default values if parsing fails
      setProjects([]);
      setActiveProject(null);
      setTransactions([]);
      setDebts([]);
      setBankAccounts([]);
      setClients([]);
      setCategories([]);
      setCurrencyState('INR');
    } finally {
      setIsLoading(false);
    }
  }, [user, isUserLoading, projectsKey, activeProjectKey, transactionsKey, debtsKey, bankAccountsKey, currencyKey, clientsKey, categoriesKey]);

  // Write to local storage whenever state changes
  useEffect(() => { if (projectsKey) localStorage.setItem(projectsKey, JSON.stringify(projects)); }, [projects, projectsKey]);
  useEffect(() => { if (activeProjectKey) localStorage.setItem(activeProjectKey, JSON.stringify(activeProject)); }, [activeProject, activeProjectKey]);
  useEffect(() => { if (transactionsKey) localStorage.setItem(transactionsKey, JSON.stringify(transactions)); }, [transactions, transactionsKey]);
  useEffect(() => { if (debtsKey) localStorage.setItem(debtsKey, JSON.stringify(debts)); }, [debts, debtsKey]);
  useEffect(() => { if (bankAccountsKey) localStorage.setItem(bankAccountsKey, JSON.stringify(bankAccounts)); }, [bankAccounts, bankAccountsKey]);
  useEffect(() => { if (currencyKey) localStorage.setItem(currencyKey, currency); }, [currency, currencyKey]);
  useEffect(() => { if (clientsKey) localStorage.setItem(clientsKey, JSON.stringify(clients)); }, [clients, clientsKey]);
  useEffect(() => { if (categoriesKey) localStorage.setItem(categoriesKey, JSON.stringify(categories)); }, [categories, categoriesKey]);

  // Data manipulation functions
  const addProject = useCallback((projectData: Omit<Project, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;
    const newProject = { ...projectData, id: crypto.randomUUID(), userId: user.uid, createdAt: new Date().toISOString() };
    setProjects(prev => [...prev, newProject]);
    if (!activeProject) { setActiveProject(newProject); }
  }, [user, activeProject]);

  const updateProject = useCallback((projectId: string, projectData: Partial<Omit<Project, 'id' | 'userId' | 'createdAt'>>) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, ...projectData } : p));
  }, []);

  const deleteProject = useCallback((projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
    setTransactions(prev => prev.filter(t => t.projectId !== projectId));
    setDebts(prev => prev.filter(d => d.projectId !== projectId));
    setClients(prev => prev.filter(c => c.projectId !== projectId));
    setCategories(prev => prev.filter(cat => cat.projectId !== projectId));
    if (activeProject?.id === projectId) {
      const allBusinessProject = projects.find(p => p.name === 'All Business');
      setActiveProject(allBusinessProject || null);
    }
  }, [activeProject, projects]);

  const addClient = useCallback((clientData: Omit<Client, 'id' | 'projectId'>) => {
    if (!user || !activeProject || activeProject.name === 'All Business') return;
    const newClient = { ...clientData, id: crypto.randomUUID(), projectId: activeProject.id };
    setClients(prev => [...prev, newClient]);
  }, [user, activeProject]);

  const updateClient = useCallback((clientId: string, clientData: Partial<Omit<Client, 'id' | 'projectId'>>) => {
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, ...clientData } : c));
  }, []);

  const deleteClient = useCallback((clientId: string) => {
    setClients(prev => prev.filter(c => c.id !== clientId));
  }, []);

  const addCategory = useCallback((categoryData: Omit<Category, 'id' | 'projectId'>) => {
    if (!user || !activeProject || activeProject.name === 'All Business') return;
    const newCategory = { ...categoryData, id: crypto.randomUUID(), projectId: activeProject.id };
    setCategories(prev => [...prev, newCategory]);
  }, [user, activeProject]);

  const updateCategory = useCallback((categoryId: string, categoryData: Partial<Omit<Category, 'id' | 'projectId'>>) => {
    setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, ...categoryData } : c));
  }, []);
  
  const deleteCategory = useCallback((categoryId: string) => {
    setCategories(prev => prev.filter(c => c.id !== categoryId));
  }, []);
  
  const updateAccountBalance = useCallback((accountId: string, amount: number, operation: 'add' | 'subtract') => {
      setBankAccounts(prevAccounts => 
        prevAccounts.map(acc => {
          if (acc.id === accountId) {
            return { ...acc, balance: operation === 'add' ? acc.balance + amount : acc.balance - amount };
          }
          return acc;
        })
      );
  }, []);

  const addTransaction = useCallback(async (transactionData: Omit<Transaction, 'id'| 'date' | 'userId' | 'projectId'>, returnRef = false): Promise<{ id: string } | void> => {
    if (!user || !activeProject || activeProject.name === 'All Business') return;
    const newTransaction = { ...transactionData, id: crypto.randomUUID(), userId: user.uid, projectId: activeProject.id, date: new Date().toISOString() };
    setTransactions(prev => [...prev, newTransaction]);
    
    if (newTransaction.type === 'income' && newTransaction.accountId) { updateAccountBalance(newTransaction.accountId, newTransaction.amount, 'add'); } 
    else if (newTransaction.type === 'expense' && newTransaction.accountId) { updateAccountBalance(newTransaction.accountId, newTransaction.amount, 'subtract'); } 
    else if (newTransaction.type === 'transfer' && newTransaction.fromAccountId && newTransaction.toAccountId) {
        updateAccountBalance(newTransaction.fromAccountId, newTransaction.amount, 'subtract');
        updateAccountBalance(newTransaction.toAccountId, newTransaction.amount, 'add');
    }
    if (returnRef) { return { id: newTransaction.id }; }
  }, [user, activeProject, updateAccountBalance]);

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
    setTransactions(prev => prev.map(t => (t.id === originalTransaction.id ? finalTransaction : t)));
  }, [updateAccountBalance]);

  const deleteTransaction = useCallback((transactionToDelete: Transaction) => {
     if (transactionToDelete.accountId) {
        if (transactionToDelete.type === 'income') { updateAccountBalance(transactionToDelete.accountId, transactionToDelete.amount, 'subtract'); } 
        else if (transactionToDelete.type === 'expense') { updateAccountBalance(transactionToDelete.accountId, transactionToDelete.amount, 'add'); }
    }
    setTransactions(prev => prev.filter(t => t.id !== transactionToDelete.id));
  }, [updateAccountBalance]);

  const addDebt = useCallback(async (debtData: Omit<Debt, 'id' | 'date' | 'userId' | 'projectId'>, returnRef = false): Promise<{ id: string } | void> => {
    if (!user || !activeProject || !debtData.accountId || activeProject.name === 'All Business') return;
    const newDebt = { ...debtData, id: crypto.randomUUID(), userId: user.uid, projectId: activeProject.id, date: new Date().toISOString() };
    setDebts(prev => [...prev, newDebt]);

    if (newDebt.type === 'creditor') { updateAccountBalance(newDebt.accountId, newDebt.amount, 'add'); } 
    else if (newDebt.type === 'debtor') { updateAccountBalance(newDebt.accountId, newDebt.amount, 'subtract'); }
    if (returnRef) { return { id: newDebt.id }; }
  }, [user, activeProject, updateAccountBalance]);

  const updateDebt = useCallback((originalDebt: Debt, updatedData: Partial<Debt>) => {
    const amountDifference = (updatedData.amount ?? originalDebt.amount) - originalDebt.amount;
    if (amountDifference !== 0 && originalDebt.accountId) {
        if (originalDebt.type === 'creditor') { updateAccountBalance(originalDebt.accountId, amountDifference, 'add'); } 
        else { updateAccountBalance(originalDebt.accountId, amountDifference, 'subtract'); }
    }
    setDebts(prev => prev.map(d => (d.id === originalDebt.id ? { ...d, ...updatedData } : d)));
  }, [updateAccountBalance]);

  const deleteDebt = useCallback((debtToDelete: Debt) => {
    if (debtToDelete.accountId) {
        if (debtToDelete.type === 'creditor') { updateAccountBalance(debtToDelete.accountId, debtToDelete.amount, 'subtract'); } 
        else { updateAccountBalance(debtToDelete.accountId, debtToDelete.amount, 'add'); }
    }
    setDebts(prev => prev.filter(d => d.id !== debtToDelete.id));
  }, [updateAccountBalance]);

  const addRepayment = useCallback((debt: Debt, amount: number, accountId: string) => {
    updateDebt(debt, { amount: debt.amount - amount });
    addTransaction({ type: 'repayment', amount, category: 'Debt Repayment', description: `Payment for debt: ${debt.name}`, debtId: debt.id, accountId: accountId });
    if (debt.type === 'creditor') { updateAccountBalance(accountId, amount, 'subtract'); } 
    else { updateAccountBalance(accountId, amount, 'add'); }
  }, [addTransaction, updateDebt, updateAccountBalance]);

  const addBankAccount = useCallback((account: Omit<BankAccount, 'id' | 'userId'>) => {
    if (!user) return;
    const newAccount = { ...account, id: crypto.randomUUID(), userId: user.uid, isPrimary: bankAccounts.length === 0 };
    setBankAccounts(prev => [...prev, newAccount]);
  }, [user, bankAccounts]);

  const updateBankAccount = useCallback((accountId: string, accountData: Partial<Omit<BankAccount, 'id' | 'userId'>>) => {
    setBankAccounts(prev => prev.map(acc => acc.id === accountId ? { ...acc, ...accountData } : acc));
  }, []);

  const deleteBankAccount = useCallback((accountId: string) => {
    setBankAccounts(prev => prev.filter(acc => acc.id !== accountId));
  }, []);

  const setCurrency = useCallback((newCurrency: string) => { setCurrencyState(newCurrency); }, []);

  const setPrimaryBankAccount = useCallback((accountId: string) => {
    setBankAccounts(prev => prev.map(acc => ({ ...acc, isPrimary: acc.id === accountId })));
  }, []);

  const getTransactionById = useCallback((id: string) => {
      return transactions.find(t => t.id === id);
  }, [transactions]);

  const getDebtById = useCallback((id: string) => {
      return debts.find(d => d.id === id);
  }, [debts]);
  
  const filteredTransactions = useMemo(() => (activeProject && activeProject.name !== 'All Business') ? transactions.filter(t => t.projectId === activeProject.id) : transactions, [transactions, activeProject]);
  const filteredDebts = useMemo(() => (activeProject && activeProject.name !== 'All Business') ? debts.filter(d => d.projectId === activeProject.id) : debts, [debts, activeProject]);
  const filteredClients = useMemo(() => (activeProject && activeProject.name !== 'All Business') ? clients.filter(c => c.projectId === activeProject.id) : [], [clients, activeProject]);
  const filteredCategories = useMemo(() => (activeProject && activeProject.name !== 'All Business') ? categories.filter(cat => cat.projectId === activeProject.id) : [], [categories, activeProject]);

  const contextValue = useMemo(() => ({
    projects, activeProject, setActiveProject, addProject, updateProject, deleteProject,
    transactions: filteredTransactions, allTransactions: transactions, addTransaction, updateTransaction, deleteTransaction, getTransactionById,
    debts: filteredDebts, addDebt, updateDebt, deleteDebt, addRepayment, getDebtById,
    bankAccounts, addBankAccount, updateBankAccount, deleteBankAccount, setPrimaryBankAccount,
    clients: filteredClients, addClient, updateClient, deleteClient,
    categories: filteredCategories, addCategory, updateCategory, deleteCategory,
    currency, setCurrency,
    isLoading: isLoading,
  }), [
      projects, activeProject, setActiveProject, addProject, updateProject, deleteProject,
      filteredTransactions, transactions, addTransaction, updateTransaction, deleteTransaction, getTransactionById,
      filteredDebts, addDebt, updateDebt, deleteDebt, addRepayment, getDebtById,
      bankAccounts, addBankAccount, updateBankAccount, deleteBankAccount, setPrimaryBankAccount,
      filteredClients, addClient, updateClient, deleteClient,
      filteredCategories, addCategory, updateCategory, deleteCategory,
      currency, setCurrency,
      isLoading
    ]);

  return (
    <FinancialContext.Provider value={contextValue}>
      {children}
    </FinancialContext.Provider>
  );
}
