'use client';

// Timestamps are stored as ISO 8061 strings.
export type LocalTimestamp = string;

export type Transaction = {
  id: string;
  user_id: string;
  project_id?: string;
  type: 'income' | 'expense' | 'transfer';
  category: string;
  amount: number;
  description: string;
  date: LocalTimestamp;
  account_id?: string;
  from_account_id?: string;
  to_account_id?: string;
  client_id?: string; // To link income/expense to a client
};

export type Loan = {
  id: string;
  user_id: string;
  project_id?: string;
  type: 'loanTaken' | 'loanGiven';
  contact_id: string;
  amount: number;
  description: string;
  due_date?: LocalTimestamp;
  status: 'active' | 'paid';
  account_id: string;
  created_at: LocalTimestamp;
};


export type BankAccount = {
  id: string;
  user_id: string;
  project_id?: string;
  name: string;
  balance: number;
  is_primary: boolean;
};

export type UserSettings = {
  id: string;
  email: string;
  currency: string;
}

export type Project = {
  id: string;
  user_id: string;
  name: string;
  created_at: LocalTimestamp;
  parent_project_id?: string;
  google_sheet_id?: string;
}

export type ChatMessage = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: LocalTimestamp;
    transaction_id?: string;
    entry_type?: 'income' | 'expense' | 'loanGiven' | 'loanTaken';
};

export type Client = {
  id: string;
  user_id: string;
  project_id?: string;
  name: string;
};

export type Contact = {
  id: string;
  user_id: string;
  name: string;
};

export type Category = {
  id: string;
  user_id: string;
  project_id?: string;
  name: string;
  type: 'income' | 'expense';
};

export type Task = {
  id: string;
  user_id: string;
  project_id?: string;
  name: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  due_date?: LocalTimestamp;
  created_at: LocalTimestamp;
};

export type Credential = {
  id: string;
  user_id: string;
  project_id?: string;
  site_name: string;
  username: string;
  password?: string;
  totp_secret?: string;
  created_at: LocalTimestamp;
};
