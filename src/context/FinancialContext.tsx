'use client';

import { createContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import type { Transaction, Debt, BankAccount, User as UserType } from '@/lib/types';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useDoc } from '@/firebase/firestore/use-doc';
import { addDocumentNonBlocking, setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

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
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [firestore, user]);
  const { data: userData, isLoading: isUserDocLoading } = useDoc<UserType>(userDocRef);

  const transactionsColRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, `users/${user.uid}/transactions`);
  }, [firestore, user]);
  const { data: transactions, isLoading: isTransactionsLoading } = useCollection<Transaction>(transactionsColRef);

  const debtsColRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, `users/${user.uid}/debts`);
  }, [firestore, user]);
  const { data: debts, isLoading: isDebtsLoading } = useCollection<Debt>(debtsColRef);

  const bankAccountsColRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, `users/${user.uid}/bankAccounts`);
  }, [firestore, user]);
  const { data: bankAccounts, isLoading: isBankAccountsLoading } = useCollection<BankAccount>(bankAccountsColRef);

  const isLoading = isUserLoading || isUserDocLoading || isTransactionsLoading || isDebtsLoading || isBankAccountsLoading;
  const currency = userData?.currency || 'INR';

  const ensureUserDocument = useCallback(async () => {
    if (!user || !firestore) return;
    const userDocRef = doc(firestore, `users/${user.uid}`);
    const docSnap = await getDoc(userDocRef);
    if (!docSnap.exists()) {
        setDocumentNonBlocking(userDocRef, {
        id: user.uid,
        email: user.email,
        name: user.displayName,
        currency: 'INR',
      }, { merge: true });
    }
  }, [user, firestore]);

  useEffect(() => {
    ensureUserDocument();
  }, [ensureUserDocument]);


  const addTransaction = useCallback((transaction: Omit<Transaction, 'id' | 'date'>) => {
    if (!transactionsColRef) return;
    const newTransaction = {
      ...transaction,
      date: serverTimestamp(),
    };
    addDocumentNonBlocking(transactionsColRef, newTransaction);
    
    // Handle balance updates for bank accounts
    if (firestore && user) {
        if(transaction.type === 'income' && transaction.accountId) {
            const accRef = doc(firestore, `users/${user.uid}/bankAccounts/${transaction.accountId}`);
            getDoc(accRef).then(docSnap => {
                if(docSnap.exists()) {
                    updateDocumentNonBlocking(accRef, { balance: docSnap.data().balance + transaction.amount });
                }
            });
        }
        if(transaction.type === 'expense' && transaction.accountId) {
            const accRef = doc(firestore, `users/${user.uid}/bankAccounts/${transaction.accountId}`);
            getDoc(accRef).then(docSnap => {
                if(docSnap.exists()) {
                    updateDocumentNonBlocking(accRef, { balance: docSnap.data().balance - transaction.amount });
                }
            });
        }
        if(transaction.type === 'transfer' && transaction.fromAccountId && transaction.toAccountId) {
            const fromAccRef = doc(firestore, `users/${user.uid}/bankAccounts/${transaction.fromAccountId}`);
            const toAccRef = doc(firestore, `users/${user.uid}/bankAccounts/${transaction.toAccountId}`);
            getDoc(fromAccRef).then(docSnap => {
                if(docSnap.exists()) {
                    updateDocumentNonBlocking(fromAccRef, { balance: docSnap.data().balance - transaction.amount });
                }
            });
            getDoc(toAccRef).then(docSnap => {
                if(docSnap.exists()) {
                    updateDocumentNonBlocking(toAccRef, { balance: docSnap.data().balance + transaction.amount });
                }
            });
        }
    }
  }, [transactionsColRef, firestore, user]);

  const addDebt = useCallback((debt: Omit<Debt, 'id' | 'date'>) => {
    if (!debtsColRef) return;
    const newDebt = {
      ...debt,
      date: serverTimestamp(),
      dueDate: debt.dueDate ? new Date(debt.dueDate) : undefined,
    };
    addDocumentNonBlocking(debtsColRef, newDebt);
  }, [debtsColRef]);

  const addBankAccount = useCallback((account: Omit<BankAccount, 'id'>) => {
    if (!bankAccountsColRef) return;
    addDocumentNonBlocking(bankAccountsColRef, account);
  }, [bankAccountsColRef]);

  const setCurrency = useCallback((newCurrency: string) => {
    if (!userDocRef) return;
    setDocumentNonBlocking(userDocRef, { currency: newCurrency }, { merge: true });
  }, [userDocRef]);

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
