'use client';

import { createContext, useCallback, ReactNode, useMemo, useState, useEffect } from 'react';
import type { Transaction, Debt, BankAccount, UserSettings, Project } from '@/lib/types';
import { useUser } from '@/firebase';

interface FinancialContextType {
  projects: Project[];
  activeProject: Project | null;
  setActiveProject: (project: Project | null) => void;
  transactions: Transaction[];
  debts: Debt[];
  bankAccounts: BankAccount[];
  currency: string;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'date' | 'userId' | 'projectId'>, returnRef?: boolean) => Promise<{ id: string } | void>;
  updateTransaction: (originalTransaction: Transaction, updatedData: Partial<Transaction>) => void;
  deleteTransaction: (transaction: Transaction) => void;
  addDebt: (debt: Omit<Debt, 'id' | 'date' | 'userId' | 'projectId'>, returnRef?: boolean) => Promise<{ id: string } | void>;
  updateDebt: (originalDebt: Debt, updatedData: Partial<Debt>) => void;
  deleteDebt: (debt: Debt) => void;
  addRepayment: (debt: Debt, amount: number, accountId: string) => void;
  addBankAccount: (account: Omit<BankAccount, 'id' | 'userId'>) => void;
  setCurrency: (currency: string) => void;
  setPrimaryBankAccount: (accountId: string) => void;
  addProject: (projectName: string) => void;
  isLoading: boolean;
  getTransactionById: (id: string) => Transaction | undefined;
  getDebtById: (id: string) => Debt | undefined;
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

  // State management
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
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
          setActiveProject(storedProjects[0]);
        }
      }

      setTransactions(storedTransactions);
      setDebts(storedDebts);
      setBankAccounts(storedBankAccounts);
      setCurrencyState(storedCurrency);

    } catch (error) {
      console.error("Failed to parse from local storage", error);
      // Initialize with empty/default values if parsing fails
      setProjects([]);
      setActiveProject(null);
      setTransactions([]);
      setDebts([]);
      setBankAccounts([]);
      setCurrencyState('INR');
    } finally {
      setIsLoading(false);
    }
  }, [user, isUserLoading, projectsKey, activeProjectKey, transactionsKey, debtsKey, bankAccountsKey, currencyKey]);

  // Write to local storage whenever state changes
  useEffect(() => {
    if (projectsKey) localStorage.setItem(projectsKey, JSON.stringify(projects));
  }, [projects, projectsKey]);
  
  useEffect(() => {
    if (activeProjectKey) localStorage.setItem(activeProjectKey, JSON.stringify(activeProject));
  }, [activeProject, activeProjectKey]);

  useEffect(() => {
    if (transactionsKey) localStorage.setItem(transactionsKey, JSON.stringify(transactions));
  }, [transactions, transactionsKey]);

  useEffect(() => {
    if (debtsKey) localStorage.setItem(debtsKey, JSON.stringify(debts));
  }, [debts, debtsKey]);

  useEffect(() => {
    if (bankAccountsKey) localStorage.setItem(bankAccountsKey, JSON.stringify(bankAccounts));
  }, [bankAccounts, bankAccountsKey]);

  useEffect(() => {
    if (currencyKey) localStorage.setItem(currencyKey, currency);
  }, [currency, currencyKey]);

  // Data manipulation functions
  const addProject = useCallback((projectName: string) => {
    if (!user) return;
    const newProject = {
      id: crypto.randomUUID(),
      name: projectName,
      userId: user.uid,
      createdAt: new Date().toISOString(),
    };
    setProjects(prev => [...prev, newProject]);
    if (!activeProject) {
        setActiveProject(newProject);
    }
  }, [user, activeProject]);
  
  const updateAccountBalance = useCallback((accountId: string, amount: number, operation: 'add' | 'subtract') => {
      setBankAccounts(prevAccounts => 
        prevAccounts.map(acc => {
          if (acc.id === accountId) {
            return {
              ...acc,
              balance: operation === 'add' ? acc.balance + amount : acc.balance - amount,
            };
          }
          return acc;
        })
      );
  }, []);

  const addTransaction = useCallback(async (transactionData: Omit<Transaction, 'id' | 'date' | 'userId' | 'projectId'>, returnRef = false): Promise<{ id: string } | void> => {
    if (!user || !activeProject) return;
    
    const newTransaction = {
      ...transactionData,
      id: crypto.randomUUID(),
      userId: user.uid,
      projectId: activeProject.id,
      date: new Date().toISOString(),
    };
    
    setTransactions(prev => [...prev, newTransaction]);
    
    if (newTransaction.type === 'income' && newTransaction.accountId) {
        updateAccountBalance(newTransaction.accountId, newTransaction.amount, 'add');
    } else if (newTransaction.type === 'expense' && newTransaction.accountId) {
        updateAccountBalance(newTransaction.accountId, newTransaction.amount, 'subtract');
    } else if (newTransaction.type === 'transfer' && newTransaction.fromAccountId && newTransaction.toAccountId) {
        updateAccountBalance(newTransaction.fromAccountId, newTransaction.amount, 'subtract');
        updateAccountBalance(newTransaction.toAccountId, newTransaction.amount, 'add');
    }
    
    if (returnRef) {
        return { id: newTransaction.id };
    }
  }, [user, activeProject, updateAccountBalance]);

  const updateTransaction = useCallback((originalTransaction: Transaction, updatedData: Partial<Transaction>) => {
    const amountDifference = (updatedData.amount ?? originalTransaction.amount) - originalTransaction.amount;
    
    // Revert original transaction effect
    if (originalTransaction.accountId) {
      if (originalTransaction.type === 'income') updateAccountBalance(originalTransaction.accountId, originalTransaction.amount, 'subtract');
      if (originalTransaction.type === 'expense') updateAccountBalance(originalTransaction.accountId, originalTransaction.amount, 'add');
    }

    const finalTransaction = { ...originalTransaction, ...updatedData };
    
    // Apply new transaction effect
    if (finalTransaction.accountId) {
        if (finalTransaction.type === 'income') updateAccountBalance(finalTransaction.accountId, finalTransaction.amount, 'add');
        if (finalTransaction.type === 'expense') updateAccountBalance(finalTransaction.accountId, finalTransaction.amount, 'subtract');
    }

    setTransactions(prev => prev.map(t => (t.id === originalTransaction.id ? finalTransaction : t)));
  }, [updateAccountBalance]);

  const deleteTransaction = useCallback((transactionToDelete: Transaction) => {
     if (transactionToDelete.accountId) {
        if (transactionToDelete.type === 'income') {
            updateAccountBalance(transactionToDelete.accountId, transactionToDelete.amount, 'subtract');
        } else if (transactionToDelete.type === 'expense') {
            updateAccountBalance(transactionToDelete.accountId, transactionToDelete.amount, 'add');
        }
    }
    setTransactions(prev => prev.filter(t => t.id !== transactionToDelete.id));
  }, [updateAccountBalance]);

  const addDebt = useCallback(async (debtData: Omit<Debt, 'id' | 'date' | 'userId' | 'projectId'>, returnRef = false): Promise<{ id: string } | void> => {
    if (!user || !activeProject || !debtData.accountId) return;
    const newDebt = {
      ...debtData,
      id: crypto.randomUUID(),
      userId: user.uid,
      projectId: activeProject.id,
      date: new Date().toISOString(),
    };
    
    setDebts(prev => [...prev, newDebt]);

    if (newDebt.type === 'creditor') {
      updateAccountBalance(newDebt.accountId, newDebt.amount, 'add');
    } else if (newDebt.type === 'debtor') {
      updateAccountBalance(newDebt.accountId, newDebt.amount, 'subtract');
    }

    if (returnRef) {
        return { id: newDebt.id };
    }
  }, [user, activeProject, updateAccountBalance]);

  const updateDebt = useCallback((originalDebt: Debt, updatedData: Partial<Debt>) => {
    const amountDifference = (updatedData.amount ?? originalDebt.amount) - originalDebt.amount;
    
    if (amountDifference !== 0 && originalDebt.accountId) {
        if (originalDebt.type === 'creditor') {
            updateAccountBalance(originalDebt.accountId, amountDifference, 'add');
        } else {
            updateAccountBalance(originalDebt.accountId, amountDifference, 'subtract');
        }
    }

    setDebts(prev => prev.map(d => (d.id === originalDebt.id ? { ...d, ...updatedData } : d)));
  }, [updateAccountBalance]);

  const deleteDebt = useCallback((debtToDelete: Debt) => {
    if (debtToDelete.accountId) {
        if (debtToDelete.type === 'creditor') {
            updateAccountBalance(debtToDelete.accountId, debtToDelete.amount, 'subtract');
        } else {
            updateAccountBalance(debtToDelete.accountId, debtToDelete.amount, 'add');
        }
    }
    setDebts(prev => prev.filter(d => d.id !== debtToDelete.id));
  }, [updateAccountBalance]);

  const addRepayment = useCallback((debt: Debt, amount: number, accountId: string) => {
    updateDebt(debt, { amount: debt.amount - amount });

    addTransaction({
      type: 'repayment',
      amount,
      category: 'Debt Repayment',
      description: `Payment for debt: ${debt.name}`,
      debtId: debt.id,
      accountId: accountId,
    });
    
    if (debt.type === 'creditor') {
      updateAccountBalance(accountId, amount, 'subtract');
    } else {
      updateAccountBalance(accountId, amount, 'add');
    }
  }, [addTransaction, updateDebt, updateAccountBalance]);

  const addBankAccount = useCallback((account: Omit<BankAccount, 'id' | 'userId'>) => {
    if (!user) return;
    const isFirstAccount = bankAccounts.length === 0;
    const newAccount = {
      ...account,
      id: crypto.randomUUID(),
      userId: user.uid,
      isPrimary: isFirstAccount,
    };
    setBankAccounts(prev => [...prev, newAccount]);
  }, [user, bankAccounts]);

  const setCurrency = useCallback((newCurrency: string) => {
    setCurrencyState(newCurrency);
  }, []);

  const setPrimaryBankAccount = useCallback((accountId: string) => {
    setBankAccounts(prev =>
      prev.map(acc => ({
        ...acc,
        isPrimary: acc.id === accountId,
      }))
    );
  }, []);

  const getTransactionById = useCallback((id: string) => {
      const projectTransactions = transactions.filter(t => t.projectId === activeProject?.id);
      return projectTransactions.find(t => t.id === id);
  }, [transactions, activeProject]);

  const getDebtById = useCallback((id: string) => {
      const projectDebts = debts.filter(d => d.projectId === activeProject?.id);
      return projectDebts.find(d => d.id === id);
  }, [debts, activeProject]);
  
  const filteredTransactions = useMemo(() => {
    if (activeProject?.name === 'All Business') {
        return transactions;
    }
    return activeProject ? transactions.filter(t => t.projectId === activeProject.id) : [];
  }, [transactions, activeProject]);
  
  const filteredDebts = useMemo(() => {
    if (activeProject?.name === 'All Business') {
        return debts;
    }
    return activeProject ? debts.filter(d => d.projectId === activeProject.id) : [];
  }, [debts, activeProject]);


  const contextValue = useMemo(() => ({
    projects,
    activeProject,
    setActiveProject,
    transactions: filteredTransactions,
    debts: filteredDebts,
    bankAccounts,
    currency,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addDebt,
    updateDebt,
    deleteDebt,
    addRepayment,
    addBankAccount,
    setCurrency,
    setPrimaryBankAccount,
    addProject,
    isLoading: isLoading,
    getTransactionById,
    getDebtById,
  }), [
      projects,
      activeProject,
      setActiveProject,
      filteredTransactions,
      filteredDebts,
      bankAccounts,
      currency,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addDebt,
      updateDebt,
      deleteDebt,
      addRepayment,
      addBankAccount,
      setCurrency,
      setPrimaryBankAccount,
      addProject,
      isLoading,
      getTransactionById,
      getDebtById
    ]);

  return (
    <FinancialContext.Provider value={contextValue}>
      {children}
    </FinancialContext.Provider>
  );
}
