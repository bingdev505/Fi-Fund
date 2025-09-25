'use client';

import { createContext, useCallback, ReactNode, useMemo } from 'react';
import type { Transaction, Debt, BankAccount, UserSettings } from '@/lib/types';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

interface FinancialContextType {
  transactions: Transaction[];
  debts: Debt[];
  bankAccounts: BankAccount[];
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

  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: userSettings, isLoading: isUserSettingsLoading } = useDoc<UserSettings>(userDocRef);

  const transactionsColRef = useMemoFirebase(() => user ? collection(firestore, 'users', user.uid, 'transactions') : null, [firestore, user]);
  const { data: transactions, isLoading: isTransactionsLoading } = useCollection<Transaction>(transactionsColRef);

  const debtsColRef = useMemoFirebase(() => user ? collection(firestore, 'users', user.uid, 'debts') : null, [firestore, user]);
  const { data: debts, isLoading: isDebtsLoading } = useCollection<Debt>(debtsColRef);

  const bankAccountsColRef = useMemoFirebase(() => user ? collection(firestore, 'users', user.uid, 'bankAccounts') : null, [firestore, user]);
  const { data: bankAccounts, isLoading: isBankAccountsLoading } = useCollection<BankAccount>(bankAccountsColRef);

  const addTransaction = useCallback((transaction: Omit<Transaction, 'id' | 'date' | 'userId'>) => {
    if (!user || !transactionsColRef) return;
    
    // Create a new object for the transaction to be saved
    const newTransactionData: Partial<Transaction> = {
      ...transaction,
      userId: user.uid,
      date: serverTimestamp() as Timestamp,
    };
    
    // Remove properties with undefined values before sending to Firestore
    Object.keys(newTransactionData).forEach(key => {
      const typedKey = key as keyof typeof newTransactionData;
      if (newTransactionData[typedKey] === undefined) {
        delete newTransactionData[typedKey];
      }
    });

    addDocumentNonBlocking(transactionsColRef, newTransactionData);
  }, [user, transactionsColRef]);

  const addDebt = useCallback((debt: Omit<Debt, 'id' | 'date' | 'userId'>) => {
    if (!user || !debtsColRef) return;
    const newDebt = {
      ...debt,
      userId: user.uid,
      date: serverTimestamp() as Timestamp,
      dueDate: debt.dueDate ? Timestamp.fromDate(new Date(debt.dueDate)) : undefined,
    };
    addDocumentNonBlocking(debtsColRef, newDebt);
  }, [user, debtsColRef]);

  const addBankAccount = useCallback((account: Omit<BankAccount, 'id'| 'userId'>) => {
    if (!user || !bankAccountsColRef) return;
    const newAccount = {
      ...account,
      userId: user.uid,
    }
    addDocumentNonBlocking(bankAccountsColRef, newAccount);
  }, [user, bankAccountsColRef]);

  const setCurrency = useCallback((currency: string) => {
    if (!userDocRef) return;
    setDocumentNonBlocking(userDocRef, { currency }, { merge: true });
  }, [userDocRef]);


  const isLoading = isUserLoading || isUserSettingsLoading || isTransactionsLoading || isDebtsLoading || isBankAccountsLoading;

  const contextValue = useMemo(() => ({
    transactions: transactions || [],
    debts: debts || [],
    bankAccounts: bankAccounts || [],
    currency: userSettings?.currency || 'INR',
    addTransaction,
    addDebt,
    addBankAccount,
    setCurrency,
    isLoading,
  }), [transactions, debts, bankAccounts, userSettings, addTransaction, addDebt, addBankAccount, setCurrency, isLoading]);

  return (
    <FinancialContext.Provider value={contextValue}>
      {children}
    </FinancialContext.Provider>
  );
}
