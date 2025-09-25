'use client';

import { createContext, useState, useCallback, ReactNode, useMemo } from 'react';
import type { Transaction, Debt, BankAccount } from '@/lib/types';

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
  const [currency, setCurrency] = useState<string>('INR');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const addTransaction = useCallback((transaction: Omit<Transaction, 'id' | 'date'>) => {
    const newTransaction = {
      ...transaction,
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
    };
    setTransactions(prev => [newTransaction, ...prev]);

    // Handle balance updates for bank accounts
    if (transaction.type === 'income' && transaction.accountId) {
        setBankAccounts(prev => prev.map(acc => acc.id === transaction.accountId ? { ...acc, balance: acc.balance + transaction.amount } : acc));
    }
    if (transaction.type === 'expense' && transaction.accountId) {
        setBankAccounts(prev => prev.map(acc => acc.id === transaction.accountId ? { ...acc, balance: acc.balance - transaction.amount } : acc));
    }
    if (transaction.type === 'transfer' && transaction.fromAccountId && transaction.toAccountId) {
        setBankAccounts(prev => prev.map(acc => {
            if (acc.id === transaction.fromAccountId) return { ...acc, balance: acc.balance - transaction.amount };
            if (acc.id === transaction.toAccountId) return { ...acc, balance: acc.balance + transaction.amount };
            return acc;
        }));
    }
  }, []);

  const addDebt = useCallback((debt: Omit<Debt, 'id' | 'date'>) => {
    const newDebt = {
      ...debt,
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      dueDate: debt.dueDate ? new Date(debt.dueDate).toISOString() : undefined,
    };
    setDebts(prev => [newDebt, ...prev]);
  }, []);

  const addBankAccount = useCallback((account: Omit<BankAccount, 'id'>) => {
    const newAccount = {
      ...account,
      id: crypto.randomUUID(),
    }
    setBankAccounts(prev => [newAccount, ...prev]);
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
