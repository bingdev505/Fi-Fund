'use client';

import type { ReactNode } from 'react';
import { createContext, useState, useMemo } from 'react';
import type { Transaction, Debt } from '@/lib/types';

interface FinancialContextType {
  transactions: Transaction[];
  debts: Debt[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'date'>) => void;
  addDebt: (debt: Omit<Debt, 'id' | 'date'>) => void;
}

export const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

export function FinancialProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);

  const addTransaction = (transaction: Omit<Transaction, 'id' | 'date'>) => {
    setTransactions(prev => [
      { ...transaction, id: crypto.randomUUID(), date: new Date() },
      ...prev
    ]);
  };
  
  const addDebt = (debt: Omit<Debt, 'id' | 'date'>) => {
    setDebts(prev => [
      {...debt, id: crypto.randomUUID(), date: new Date() },
      ...prev
    ]);
  };

  const contextValue = useMemo(() => ({
    transactions,
    debts,
    addTransaction,
    addDebt,
  }), [transactions, debts]);

  return (
    <FinancialContext.Provider value={contextValue}>
      {children}
    </FinancialContext.Provider>
  );
}
