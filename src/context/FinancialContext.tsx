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
  addRepayment: (debt: Debt, amount: number, accountId: string) => void;
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

    let finalTransaction: any = {
      ...transactionData,
      userId: user.uid,
      date: serverTimestamp() as Timestamp,
    };
    
    if (transactionData.type === 'income' || transactionData.type === 'expense') {
        finalTransaction.accountId = transactionData.accountId;
        delete finalTransaction.fromAccountId;
        delete finalTransaction.toAccountId;
    } else if (transactionData.type === 'transfer') {
        finalTransaction.fromAccountId = transactionData.fromAccountId;
        finalTransaction.toAccountId = transactionData.toAccountId;
        delete finalTransaction.accountId;
    }
    
    addDocumentNonBlocking(transactionsColRef, finalTransaction);

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
    if (!user || !debtsColRef || !firestore || !debt.accountId) return;

    const newDebt: any = {
      ...debt,
      userId: user.uid,
      date: serverTimestamp() as Timestamp,
    };
    
    if (debt.dueDate) {
      newDebt.dueDate = Timestamp.fromDate(new Date(debt.dueDate));
    }
    
    addDocumentNonBlocking(debtsColRef, newDebt);

    // When a debt is created, the money moves.
    // 'creditor' (I owe someone) implies money came INTO my account (e.g. taking a loan).
    // 'debtor' (Someone owes me) implies money went OUT of my account (e.g. loaning someone money).
    if (debt.type === 'creditor') { 
      updateAccountBalance(firestore, user.uid, debt.accountId, debt.amount, 'add');
    } else if (debt.type === 'debtor') { 
      updateAccountBalance(firestore, user.uid, debt.accountId, debt.amount, 'subtract');
    }

  }, [user, firestore, debtsColRef]);

  const addRepayment = useCallback((debt: Debt, amount: number, accountId: string) => {
    if (!user || !debtsColRef || !firestore || !transactionsColRef) return;
    
    const debtRef = doc(debtsColRef, debt.id);
    const newDebtAmount = debt.amount - amount;

    // Non-blocking update to the debt amount
    updateDocumentNonBlocking(debtRef, { amount: newDebtAmount });

    // Add a corresponding transaction log for the repayment
    const repaymentTransaction = {
      type: 'repayment' as const,
      amount: amount,
      category: 'Debt Repayment',
      description: `Payment for debt: ${debt.name}`,
      date: serverTimestamp() as Timestamp,
      userId: user.uid,
      debtId: debt.id,
      accountId: accountId,
    };
    addDocumentNonBlocking(transactionsColRef, repaymentTransaction);
    
    // Update the bank account balance based on the debt type
    if (debt.type === 'creditor') {
      // I am paying someone back, so money SUBTRACTS from my account
      updateAccountBalance(firestore, user.uid, accountId, amount, 'subtract');
    } else { // 'debtor'
      // Someone is paying me back, so money ADDS to my account
      updateAccountBalance(firestore, user.uid, accountId, amount, 'add');
    }
  }, [user, firestore, debtsColRef, transactionsColRef]);

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
    addRepayment,
    addBankAccount,
    setCurrency,
    setPrimaryBankAccount,
    isLoading,
  }), [transactions, debts, bankAccounts, userSettings, addTransaction, addDebt, addRepayment, addBankAccount, setCurrency, setPrimaryBankAccount, isLoading]);

  return (
    <FinancialContext.Provider value={contextValue}>
      {children}
    </FinancialContext.Provider>
  );
}
