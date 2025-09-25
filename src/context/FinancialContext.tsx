'use client';

import type { ReactNode } from 'react';
import { createContext, useState, useMemo } from 'react';
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
}

export const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

export function FinancialProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [currency, setCurrency] = useState<string>('INR');

  const addTransaction = (transaction: Omit<Transaction, 'id' | 'date'>) => {
    const newTransaction = { ...transaction, id: crypto.randomUUID(), date: new Date() };
    setTransactions(prev => [newTransaction, ...prev]);

    setBankAccounts(prev => 
      prev.map(account => {
        if (transaction.type === 'income' && account.id === transaction.accountId) {
          return { ...account, balance: account.balance + transaction.amount };
        }
        if (transaction.type === 'expense' && account.id === transaction.accountId) {
          return { ...account, balance: account.balance - transaction.amount };
        }
        if (transaction.type === 'transfer') {
            if(account.id === transaction.fromAccountId) {
                return { ...account, balance: account.balance - transaction.amount };
            }
            if(account.id === transaction.toAccountId) {
                return { ...account, balance: account.balance + transaction.amount };
            }
        }
        return account;
      })
    );
  };
  
  const addDebt = (debt: Omit<Debt, 'id' | 'date'>) => {
    setDebts(prev => [
      {...debt, id: crypto.randomUUID(), date: new Date() },
      ...prev
    ]);
  };

  const addBankAccount = (account: Omit<BankAccount, 'id'>) => {
    setBankAccounts(prev => [
      { ...account, id: crypto.randomUUID() },
      ...prev
    ]);
  };

  const contextValue = useMemo(() => ({
    transactions,
    debts,
    bankAccounts,
    currency,
    addTransaction,
    addDebt,
    addBankAccount,
    setCurrency,
  }), [transactions, debts, bankAccounts, currency]);

  return (
    <FinancialContext.Provider value={contextValue}>
      {children}
    </FinancialContext.Provider>
  );
}
