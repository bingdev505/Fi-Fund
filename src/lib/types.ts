'use client';

// Timestamps are stored as ISO 8061 strings.
export type LocalTimestamp = string;

export type Transaction = {
  id: string;
  user_id: string;
  project_id?: string;
  type: 'income' | 'expense' | 'transfer' | 'repayment';
  category: string;
  amount: number;
  description: string;
  date: LocalTimestamp;
  account_id?: string;
  from_account_id?: string;
  to_account_id?: string;
  debt_id?: string; // To link repayment to a debt
  client_id?: string; // To link income/expense to a client
};

export type Debt = {
  id:string;
  user_id: string;
  project_id?: string;
  type: 'creditor' | 'debtor';
  name: string; // This will now be the client's name from the Client list
  client_id: string; // Link to the Client
  amount: number;
  description: string;
  due_date?: LocalTimestamp;
  date: LocalTimestamp;
  account_id: string;
};

export type BankAccount = {
  id: string;
  user_id: string;
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
    entry_type?: 'income' | 'expense' | 'creditor' | 'debtor';
};

export type Client = {
  id: string;
  user_id: string;
  project_id?: string;
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
