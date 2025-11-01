'use client';

// Timestamps are stored as ISO 8061 strings.
export type LocalTimestamp = string;

export type Transaction = {
  id: string;
  userId: string;
  projectId?: string;
  type: 'income' | 'expense' | 'transfer' | 'repayment';
  category: string;
  amount: number;
  description: string;
  date: LocalTimestamp;
  accountId?: string;
  fromAccountId?: string;
  toAccountId?: string;
  debtId?: string; // To link repayment to a debt
  clientId?: string; // To link income/expense to a client
};

export type Debt = {
  id:string;
  userId: string;
  projectId?: string;
  type: 'creditor' | 'debtor';
  name: string; // This will now be the client's name from the Client list
  clientId: string; // Link to the Client
  amount: number;
  description: string;
  dueDate?: LocalTimestamp;
  date: LocalTimestamp;
  accountId: string;
};

export type BankAccount = {
  id: string;
  userId: string;
  name: string;
  balance: number;
  isPrimary: boolean;
};

export type UserSettings = {
  id: string;
  email: string;
  currency: string;
}

export type Project = {
  id: string;
  userId: string;
  name: string;
  createdAt: LocalTimestamp;
  parentProjectId?: string;
  googleSheetId?: string;
}

export type ChatMessage = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: LocalTimestamp;
    transactionId?: string;
    entryType?: 'income' | 'expense' | 'creditor' | 'debtor';
};

export type Client = {
  id: string;
  userId: string;
  projectId?: string;
  name: string;
};

export type Category = {
  id: string;
  userId: string;
  projectId?: string;
  name: string;
  type: 'income' | 'expense';
};

export type Task = {
  id: string;
  userId: string;
  projectId?: string;
  name: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  dueDate?: LocalTimestamp;
  createdAt: LocalTimestamp;
};

export type Credential = {
  id: string;
  userId: string;
  projectId?: string;
  siteName: string;
  username: string;
  password?: string;
  totpSecret?: string;
  createdAt: LocalTimestamp;
};
