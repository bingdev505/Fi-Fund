import { Timestamp } from 'firebase/firestore';

export type Transaction = {
  id: string;
  userId: string;
  type: 'income' | 'expense' | 'transfer';
  category: string;
  amount: number;
  description: string;
  date: Timestamp;
  accountId?: string;
  fromAccountId?: string;
  toAccountId?: string;
};

export type Debt = {
  id:string;
  userId: string;
  type: 'creditor' | 'debtor';
  name: string;
  amount: number;
  description: string;
  dueDate?: Timestamp;
  date: Timestamp;
};

export type BankAccount = {
  id: string;
  userId: string;
  name: string;
  balance: number;
};

export type UserSettings = {
  id: string;
  email: string;
  currency: string;
}
