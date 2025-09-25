'use client';

import { createContext, useCallback, ReactNode, useMemo } from 'react';
import type { Transaction, Debt, BankAccount, UserSettings } from '@/lib/types';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc, serverTimestamp, Timestamp, writeBatch, runTransaction, Firestore, DocumentReference } from 'firebase/firestore';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

interface FinancialContextType {
  transactions: Transaction[];
  debts: Debt[];
  bankAccounts: BankAccount[];
  currency: string;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'date' | 'userId'>, returnRef?: boolean) => Promise<DocumentReference | void>;
  updateTransaction: (originalTransaction: Transaction, updatedData: Partial<Transaction>) => void;
  deleteTransaction: (transaction: Transaction) => void;
  addDebt: (debt: Omit<Debt, 'id' | 'date' | 'userId'>, returnRef?: boolean) => Promise<DocumentReference | void>;
  updateDebt: (originalDebt: Debt, updatedData: Partial<Debt>) => void;
  deleteDebt: (debt: Debt) => void;
  addRepayment: (debt: Debt, amount: number, accountId: string) => void;
  addBankAccount: (account: Omit<BankAccount, 'id' | 'userId'>) => void;
  setCurrency: (currency: string) => void;
  setPrimaryBankAccount: (accountId: string) => void;
  isLoading: boolean;
  getTransactionById: (id: string) => Transaction | undefined;
  getDebtById: (id: string) => Debt | undefined;
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

  const addTransaction = useCallback(async (transactionData: Omit<Transaction, 'id' | 'date' | 'userId'>, returnRef = false): Promise<DocumentReference | void> => {
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
    
    const docRefPromise = addDocumentNonBlocking(transactionsColRef, finalTransaction);

    if (transactionData.type === 'income' && transactionData.accountId) {
      updateAccountBalance(firestore, user.uid, transactionData.accountId, transactionData.amount, 'add');
    } else if (transactionData.type === 'expense' && transactionData.accountId) {
      updateAccountBalance(firestore, user.uid, transactionData.accountId, transactionData.amount, 'subtract');
    } else if (transactionData.type === 'transfer' && transactionData.fromAccountId && transactionData.toAccountId) {
      updateAccountBalance(firestore, user.uid, transactionData.fromAccountId, transactionData.amount, 'subtract');
      updateAccountBalance(firestore, user.uid, transactionData.toAccountId, transactionData.amount, 'add');
    }

    if (returnRef) {
        return docRefPromise;
    }
  }, [user, firestore, transactionsColRef]);

  const updateTransaction = useCallback(async (originalTransaction: Transaction, updatedData: Partial<Transaction>) => {
    if (!user || !firestore || !transactionsColRef) return;

    const transactionRef = doc(transactionsColRef, originalTransaction.id);

    try {
        await runTransaction(firestore, async (transaction) => {
            // 1. Revert original transaction's effect on balance
            if (originalTransaction.type === 'income' && originalTransaction.accountId) {
                const accRef = doc(firestore, 'users', user.uid, 'bankAccounts', originalTransaction.accountId);
                const accDoc = await transaction.get(accRef);
                const newBalance = (accDoc.data()?.balance || 0) - originalTransaction.amount;
                transaction.update(accRef, { balance: newBalance });
            } else if (originalTransaction.type === 'expense' && originalTransaction.accountId) {
                const accRef = doc(firestore, 'users', user.uid, 'bankAccounts', originalTransaction.accountId);
                const accDoc = await transaction.get(accRef);
                const newBalance = (accDoc.data()?.balance || 0) + originalTransaction.amount;
                transaction.update(accRef, { balance: newBalance });
            }

            // 2. Apply new transaction's effect on balance
            const newAmount = updatedData.amount ?? originalTransaction.amount;
            const newType = updatedData.type ?? originalTransaction.type;
            const newAccountId = updatedData.accountId ?? originalTransaction.accountId;

            if (newType === 'income' && newAccountId) {
                const accRef = doc(firestore, 'users', user.uid, 'bankAccounts', newAccountId);
                const accDoc = await transaction.get(accRef);
                const newBalance = (accDoc.data()?.balance || 0) + newAmount;
                transaction.update(accRef, { balance: newBalance });
            } else if (newType === 'expense' && newAccountId) {
                const accRef = doc(firestore, 'users', user.uid, 'bankAccounts', newAccountId);
                const accDoc = await transaction.get(accRef);
                const newBalance = (accDoc.data()?.balance || 0) - newAmount;
                transaction.update(accRef, { balance: newBalance });
            }

            // 3. Update the transaction document itself
            transaction.update(transactionRef, updatedData);
        });
    } catch (e) {
        console.error("Update transaction failed:", e);
    }
}, [user, firestore, transactionsColRef]);

const deleteTransaction = useCallback(async (transactionToDelete: Transaction) => {
    if (!user || !firestore || !transactionsColRef) return;

    const transactionRef = doc(transactionsColRef, transactionToDelete.id);

    try {
        await runTransaction(firestore, async (transaction) => {
            // Revert balance change
             if (transactionToDelete.type === 'income' && transactionToDelete.accountId) {
                const accRef = doc(firestore, 'users', user.uid, 'bankAccounts', transactionToDelete.accountId);
                const accDoc = await transaction.get(accRef);
                if(accDoc.exists()) {
                    const newBalance = accDoc.data().balance - transactionToDelete.amount;
                    transaction.update(accRef, { balance: newBalance });
                }
            } else if (transactionToDelete.type === 'expense' && transactionToDelete.accountId) {
                const accRef = doc(firestore, 'users', user.uid, 'bankAccounts', transactionToDelete.accountId);
                const accDoc = await transaction.get(accRef);
                if(accDoc.exists()) {
                    const newBalance = accDoc.data().balance + transactionToDelete.amount;
                    transaction.update(accRef, { balance: newBalance });
                }
            }
            // Delete the transaction doc
            transaction.delete(transactionRef);
        });
    } catch (e) {
        console.error("Delete transaction failed:", e);
    }
}, [user, firestore, transactionsColRef]);


  const addDebt = useCallback(async (debt: Omit<Debt, 'id' | 'date' | 'userId'>, returnRef = false): Promise<DocumentReference | void> => {
    if (!user || !debtsColRef || !firestore || !debt.accountId) return;

    const newDebt: any = {
      ...debt,
      userId: user.uid,
      date: serverTimestamp() as Timestamp,
    };
    
    if (debt.dueDate) {
      newDebt.dueDate = Timestamp.fromDate(new Date(debt.dueDate));
    }
    
    const docRefPromise = addDocumentNonBlocking(debtsColRef, newDebt);

    // When a debt is created, the money moves.
    // 'creditor' (I owe someone) implies money came INTO my account (e.g. taking a loan).
    // 'debtor' (Someone owes me) implies money went OUT of my account (e.g. loaning someone money).
    if (debt.type === 'creditor') { 
      updateAccountBalance(firestore, user.uid, debt.accountId, debt.amount, 'add');
    } else if (debt.type === 'debtor') { 
      updateAccountBalance(firestore, user.uid, debt.accountId, debt.amount, 'subtract');
    }

    if (returnRef) {
        return docRefPromise;
    }

  }, [user, firestore, debtsColRef]);

  const updateDebt = useCallback(async (originalDebt: Debt, updatedData: Partial<Debt>) => {
    if (!user || !firestore || !debtsColRef) return;
    
    const debtRef = doc(debtsColRef, originalDebt.id);

    try {
        await runTransaction(firestore, async (transaction) => {
            const newAmount = updatedData.amount ?? originalDebt.amount;
            const amountDifference = newAmount - originalDebt.amount;
            
            // If amount has changed, update the associated bank account balance
            if (amountDifference !== 0 && originalDebt.accountId) {
                const accRef = doc(firestore, 'users', user.uid, 'bankAccounts', originalDebt.accountId);
                const accDoc = await transaction.get(accRef);

                if(accDoc.exists()) {
                    let newBalance;
                    // For creditor, an increase in debt means more money received.
                    // For debtor, an increase in debt means more money given out.
                    if (originalDebt.type === 'creditor') {
                        newBalance = accDoc.data().balance + amountDifference;
                    } else { // debtor
                        newBalance = accDoc.data().balance - amountDifference;
                    }
                    transaction.update(accRef, { balance: newBalance });
                }
            }

            // Update the debt document
            const finalUpdateData = { ...updatedData };
            if (finalUpdateData.dueDate && !(finalUpdateData.dueDate instanceof Timestamp)) {
                finalUpdateData.dueDate = Timestamp.fromDate(new Date(finalUpdateData.dueDate));
            }
            transaction.update(debtRef, finalUpdateData);
        });
    } catch(e) {
        console.error("Update debt failed:", e);
    }
  }, [user, firestore, debtsColRef]);

  const deleteDebt = useCallback(async (debtToDelete: Debt) => {
      if (!user || !firestore || !debtsColRef) return;

      const debtRef = doc(debtsColRef, debtToDelete.id);
      
      try {
        await runTransaction(firestore, async (transaction) => {
            // Revert the initial balance change from creating the debt
            if (debtToDelete.accountId) {
                const accRef = doc(firestore, 'users', user.uid, 'bankAccounts', debtToDelete.accountId);
                const accDoc = await transaction.get(accRef);

                if (accDoc.exists()) {
                    let newBalance;
                    // To delete a creditor debt, revert the money you received.
                    if (debtToDelete.type === 'creditor') {
                        newBalance = accDoc.data().balance - debtToDelete.amount;
                    } else { // To delete a debtor debt, revert the money you gave out.
                        newBalance = accDoc.data().balance + debtToDelete.amount;
                    }
                    transaction.update(accRef, { balance: newBalance });
                }
            }
            // Delete the debt document
            transaction.delete(debtRef);
        });
      } catch(e) {
        console.error("Delete debt failed:", e);
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
    // If it's a creditor (I owe them), I am paying them back, so money SUBTRACTS from my account.
    // If it's a debtor (they owe me), they are paying me back, so money ADDS to my account.
    if (debt.type === 'creditor') {
      updateAccountBalance(firestore, user.uid, accountId, amount, 'subtract');
    } else { // 'debtor'
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
  
  const getTransactionById = useCallback((id: string) => {
      return transactions?.find(t => t.id === id);
  }, [transactions]);

  const getDebtById = useCallback((id: string) => {
      return debts?.find(d => d.id === id);
  }, [debts]);


  const isLoading = isUserLoading || isUserSettingsLoading || isTransactionsLoading || isDebtsLoading || isBankAccountsLoading;

  const contextValue = useMemo(() => ({
    transactions: transactions || [],
    debts: debts || [],
    bankAccounts: bankAccounts || [],
    currency: userSettings?.currency || 'INR',
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
    isLoading,
    getTransactionById,
    getDebtById,
  }), [
      transactions, 
      debts, 
      bankAccounts, 
      userSettings, 
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
