'use client';

import { createContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import type { Transaction, Debt, BankAccount } from '@/lib/types';

// Helper to get data from localStorage
function getLocalStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') {
    return fallback;
  }
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : fallback;
}

// Helper to set data in localStorage
function setLocalStorage<T>(key: string, value: T) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

interface FinancialContextType {
  transactions: Transaction[];
  debts: Debt[];
  bankAccounts: BankAccount[];
  currency: string;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'date'>) => void;
  addDebt: (debt: Omit<Debt, 'id' | 'date'>) => void;
  addBankAccount: (account: Omit<BankAccount, 'id'>) => void;
  setCurrency: (currency: string) => void;
  isLoading: boolean;
}

export const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

export function FinancialProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [currency, setCurrencyState] = useState<string>('INR');
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data from localStorage
  useEffect(() => {
    setTransactions(getLocalStorage('transactions', []));
    setDebts(getLocalStorage('debts', []));
    setBankAccounts(getLocalStorage('bankAccounts', []));
    setCurrencyState(getLocalStorage('currency', 'INR'));
    setIsLoading(false);
  }, []);

  // Persist data to localStorage whenever it changes
  useEffect(() => {
    setLocalStorage('transactions', transactions);
  }, [transactions]);

  useEffect(() => {
    setLocalStorage('debts', debts);
  }, [debts]);

  useEffect(() => {
    setLocalStorage('bankAccounts', bankAccounts);
  }, [bankAccounts]);

  useEffect(() => {
    setLocalStorage('currency', currency);
  }, [currency]);

  const addTransaction = useCallback((transaction: Omit<Transaction, 'id' | 'date'>) => {
    setTransactions(prev => {
        const newTransaction: Transaction = {
          ...transaction,
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
        };
        const newTransactions = [...prev, newTransaction];
        
        // Handle account balance updates for local state
        setBankAccounts(currentAccounts => {
            let updatedAccounts = [...currentAccounts];
            if (transaction.type === 'income' && transaction.accountId) {
                updatedAccounts = updatedAccounts.map(acc => acc.id === transaction.accountId ? { ...acc, balance: acc.balance + transaction.amount } : acc);
            }
            if (transaction.type === 'expense' && transaction.accountId) {
                updatedAccounts = updatedAccounts.map(acc => acc.id === transaction.accountId ? { ...acc, balance: acc.balance - transaction.amount } : acc);
            }
            if (transaction.type === 'transfer' && transaction.fromAccountId && transaction.toAccountId) {
                updatedAccounts = updatedAccounts.map(acc => {
                    if (acc.id === transaction.fromAccountId) return { ...acc, balance: acc.balance - transaction.amount };
                    if (acc.id === transaction.toAccountId) return { ...acc, balance: acc.balance + transaction.amount };
                    return acc;
                });
            }
            setLocalStorage('bankAccounts', updatedAccounts); // Persist updated accounts
            return updatedAccounts;
        });

        return newTransactions;
    });
  }, []);

  const addDebt = useCallback((debt: Omit<Debt, 'id' | 'date'>) => {
    setDebts(prev => [
      ...prev,
      {
        ...debt,
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        dueDate: debt.dueDate ? new Date(debt.dueDate).toISOString() : undefined,
      },
    ]);
  }, []);

  const addBankAccount = useCallback((account: Omit<BankAccount, 'id'>) => {
    setBankAccounts(prev => [
      ...prev,
      {
        ...account,
        id: crypto.randomUUID(),
      },
    ]);
  }, []);

  const setCurrency = useCallback((newCurrency: string) => {
    setCurrencyState(newCurrency);
  }, []);

  const contextValue = useMemo(() => ({
    transactions,
    debts,
    bankAccounts,
    currency,
    addTransaction,
    addDebt,
    addBankAccount,
    setCurrency,
    isLoading,
  }), [transactions, debts, bankAccounts, currency, addTransaction, addDebt, addBankAccount, setCurrency, isLoading]);

  return (
    <FinancialContext.Provider value={contextValue}>
      {children}
    </FinancialContext.Provider>
  );
}
