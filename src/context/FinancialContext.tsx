'use client';

import { createContext, useMemo, useCallback, ReactNode } from 'react';
import {
  collection,
  doc,
} from 'firebase/firestore';
import {
  useFirestore,
  useUser,
  useCollection,
  useDoc,
  useMemoFirebase,
  addDocumentNonBlocking,
  setDocumentNonBlocking,
} from '@/firebase';
import type { Transaction, Debt, BankAccount, User } from '@/lib/types';
import { WithId } from '@/firebase/firestore/use-collection';

interface FinancialContextType {
  transactions: WithId<Transaction>[];
  debts: WithId<Debt>[];
  bankAccounts: WithId<BankAccount>[];
  currency: string;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'date' | 'userId'>) => void;
  addDebt: (debt: Omit<Debt, 'id' | 'date' | 'userId'>) => void;
  addBankAccount: (account: Omit<BankAccount, 'id' | 'userId'>) => void;
  setCurrency: (currency: string) => void;
  isLoading: boolean;
}

export const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

export function FinancialProvider({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const transactionsQuery = useMemoFirebase(() => 
    user ? collection(firestore, 'users', user.uid, 'transactions') : null
  , [firestore, user]);
  const { data: transactions, isLoading: transactionsLoading } = useCollection<Transaction>(transactionsQuery);

  const debtsQuery = useMemoFirebase(() =>
    user ? collection(firestore, 'users', user.uid, 'debts') : null
  , [firestore, user]);
  const { data: debts, isLoading: debtsLoading } = useCollection<Debt>(debtsQuery);
  
  const bankAccountsQuery = useMemoFirebase(() =>
    user ? collection(firestore, 'users', user.uid, 'bankAccounts') : null
  , [firestore, user]);
  const { data: bankAccounts, isLoading: bankAccountsLoading } = useCollection<BankAccount>(bankAccountsQuery);

  const userSettingsRef = useMemoFirebase(() => 
    user ? doc(firestore, 'users', user.uid) : null
  , [firestore, user]);
  const { data: userSettings, isLoading: userSettingsLoading } = useDoc<User>(userSettingsRef);
  
  const currency = userSettings?.currency || 'INR'; 

  const setCurrency = useCallback((newCurrency: string) => {
    if (userSettingsRef) {
      setDocumentNonBlocking(userSettingsRef, { currency: newCurrency }, { merge: true });
    }
  }, [userSettingsRef]);


  const addTransaction = useCallback((transaction: Omit<Transaction, 'id' | 'date' | 'userId'>) => {
    if (!transactionsQuery || !user) return;
    
    const newTransaction = { 
      ...transaction, 
      userId: user.uid,
      date: new Date().toISOString() 
    };
    addDocumentNonBlocking(transactionsQuery, newTransaction);

    if (bankAccounts) {
      if (transaction.type === 'income' && transaction.accountId) {
        const acc = bankAccounts.find(a => a.id === transaction.accountId);
        if (acc) {
          const accountRef = doc(firestore, 'users', user.uid, 'bankAccounts', acc.id);
          setDocumentNonBlocking(accountRef, { balance: acc.balance + transaction.amount }, { merge: true });
        }
      }
      if (transaction.type === 'expense' && transaction.accountId) {
        const acc = bankAccounts.find(a => a.id === transaction.accountId);
        if (acc) {
          const accountRef = doc(firestore, 'users', user.uid, 'bankAccounts', acc.id);
          setDocumentNonBlocking(accountRef, { balance: acc.balance - transaction.amount }, { merge: true });
        }
      }
      if (transaction.type === 'transfer') {
        const fromAcc = bankAccounts.find(a => a.id === transaction.fromAccountId);
        const toAcc = bankAccounts.find(a => a.id === transaction.toAccountId);
        if(fromAcc) {
          const fromAccountRef = doc(firestore, 'users', user.uid, 'bankAccounts', fromAcc.id);
          setDocumentNonBlocking(fromAccountRef, { balance: fromAcc.balance - transaction.amount }, { merge: true });
        }
        if(toAcc) {
          const toAccountRef = doc(firestore, 'users', user.uid, 'bankAccounts', toAcc.id);
          setDocumentNonBlocking(toAccountRef, { balance: toAcc.balance + transaction.amount }, { merge: true });
        }
      }
    }
  }, [transactionsQuery, bankAccounts, firestore, user]);

  const addDebt = useCallback((debt: Omit<Debt, 'id' | 'date' | 'userId'>) => {
    if (!debtsQuery || !user) return;
    const newDebt = { 
      ...debt, 
      userId: user.uid,
      date: new Date().toISOString(),
      dueDate: debt.dueDate ? debt.dueDate.toISOString() : undefined
    };
    addDocumentNonBlocking(debtsQuery, newDebt);
  }, [debtsQuery, user]);

  const addBankAccount = useCallback((account: Omit<BankAccount, 'id' | 'userId'>) => {
    if (!bankAccountsQuery || !user) return;
    const newAccount = { ...account, userId: user.uid };
    addDocumentNonBlocking(bankAccountsQuery, newAccount);
  }, [bankAccountsQuery, user]);

  const isLoading = isUserLoading || transactionsLoading || debtsLoading || bankAccountsLoading || userSettingsLoading;

  const contextValue = useMemo(() => ({
    transactions: transactions || [],
    debts: debts || [],
    bankAccounts: bankAccounts || [],
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
