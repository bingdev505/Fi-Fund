'use client';
import { Timestamp } from 'firebase/firestore';

export type Transaction = {
  id: string;
  userId: string;
  type: 'income' | 'expense' | 'transfer' | 'repayment';
  category: string;
  amount: number;
  description: string;
  date: Timestamp;
  accountId?: string;
  fromAccountId?: string;
  toAccountId?: string;
  debtId?: string; // To link repayment to a debt
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
  accountId?: string;
};

export type BankAccount = {
  id: string;
  userId: string;
  name: string;
  balance: number;
  isPrimary?: boolean;
};

export type UserSettings = {
  id: string;
  email: string;
  currency: string;
}

export type ChatMessage = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Timestamp;
};
