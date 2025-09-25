'use client';

import { createContext, useCallback, ReactNode, useMemo } from 'react';
import type { Transaction, Debt, BankAccount, UserSettings } from '@/lib/types';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc, serverTimestamp, Timestamp, writeBatch, runTransaction, Firestore } from 'firebase/firestore';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

interface FinancialContextType {
  transactions: Transaction[];
  debts: Debt[];
  bankAccounts: BankAccount[];
  currency: string;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'date' | 'userId'>) => void;
  addDebt: (debt: Omit<Debt, 'id' | 'date' | 'userId'>) => void;
  addBankAccount: (account: Omit<BankAccount, 'id' | 'userId'>) => void;
  setCurrency: (currency: string) => void;
  setPrimaryBankAccount: (accountId: string) => void;
  isLoading: boolean;
}

export const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

async function updateAccountBalance(
  firestore: Firestore,
  userId: string,
  accountId: string,
  amount: number,
  operation: 'add' | 'subtract'
) {
  const accountRef = doc(firestore, 'users', userId, 'bankAccounts', accountId);
  try {
    await runTransaction(firestore, async (transaction) => {
      const accountDoc = await transaction.get(accountRef);
      if (!accountDoc.exists()) {
        throw "Bank account not found!";
      }
      const currentBalance = accountDoc.data().balance;
      const newBalance = operation === 'add' ? currentBalance + amount : currentBalance - amount;
      transaction.update(accountRef, { balance: newBalance });
    });
  } catch (e) {
    console.error("Transaction failed: ", e);
  }
}

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

  const addTransaction = useCallback((transactionData: Omit<Transaction, 'id' | 'date' | 'userId'>) => {
    if (!user || !transactionsColRef || !firestore) return;

    // Base transaction object
    const baseTransaction: Omit<Transaction, 'id'> = {
      ...transactionData,
      userId: user.uid,
      date: serverTimestamp() as Timestamp,
    };
    
    // Conditionally add account fields to avoid 'undefined'
    let finalTransaction: any = baseTransaction;
    if (transactionData.type === 'income' || transactionData.type === 'expense') {
        finalTransaction = {
            ...baseTransaction,
            accountId: transactionData.accountId,
        }
        // remove transfer fields
        delete finalTransaction.fromAccountId;
        delete finalTransaction.toAccountId;
    } else if (transactionData.type === 'transfer') {
        finalTransaction = {
            ...baseTransaction,
            fromAccountId: transactionData.fromAccountId,
            toAccountId: transactionData.toAccountId,
        }
        // remove income/expense field
        delete finalTransaction.accountId;
    }
    
    addDocumentNonBlocking(transactionsColRef, finalTransaction);

    // Update account balances
    if (transactionData.type === 'income' && transactionData.accountId) {
      updateAccountBalance(firestore, user.uid, transactionData.accountId, transactionData.amount, 'add');
    } else if (transactionData.type === 'expense' && transactionData.accountId) {
      updateAccountBalance(firestore, user.uid, transactionData.accountId, transactionData.amount, 'subtract');
    } else if (transactionData.type === 'transfer' && transactionData.fromAccountId && transactionData.toAccountId) {
      updateAccountBalance(firestore, user.uid, transactionData.fromAccountId, transactionData.amount, 'subtract');
      updateAccountBalance(firestore, user.uid, transactionData.toAccountId, transactionData.amount, 'add');
    }
  }, [user, firestore, transactionsColRef]);


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
    const isFirstAccount = !bankAccounts || bankAccounts.length === 0;
    const newAccount = {
      ...account,
      userId: user.uid,
      isPrimary: isFirstAccount,
    }
    addDocumentNonBlocking(bankAccountsColRef, newAccount);
  }, [user, bankAccountsColRef, bankAccounts]);

  const setCurrency = useCallback((currency: string) => {
    if (!userDocRef) return;
    setDocumentNonBlocking(userDocRef, { currency }, { merge: true });
  }, [userDocRef]);

  const setPrimaryBankAccount = useCallback((accountId: string) => {
    if (!user || !bankAccountsColRef || !bankAccounts || !firestore) return;
  
    const batch = writeBatch(firestore);
  
    bankAccounts.forEach(account => {
      const accountRef = doc(bankAccountsColRef, account.id);
      if (account.id === accountId) {
        batch.update(accountRef, { isPrimary: true });
      } else if (account.isPrimary) {
        batch.update(accountRef, { isPrimary: false });
      }
    });
  
    batch.commit().catch(error => {
      console.error("Failed to set primary bank account:", error);
    });
  
  }, [user, firestore, bankAccountsColRef, bankAccounts]);


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
    setPrimaryBankAccount,
    isLoading,
  }), [transactions, debts, bankAccounts, userSettings, addTransaction, addDebt, addBankAccount, setCurrency, setPrimaryBankAccount, isLoading]);

  return (
    <FinancialContext.Provider value={contextValue}>
      {children}
    </FinancialContext.Provider>
  );
}
