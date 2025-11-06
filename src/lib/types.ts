'use client';
import { z } from 'zod';

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
  client_id?: string; // To link income/expense to a client
  loan_id?: string; // To link repayment to a loan
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

// Zod schemas for Google Sheet Sync Flow
const TransactionSchemaForSync = z.object({
  id: z.string(),
  user_id: z.string(),
  project_id: z.string().optional(),
  type: z.enum(['income', 'expense', 'transfer', 'repayment']),
  category: z.string(),
  amount: z.number(),
  description: z.string(),
  date: z.string(),
  account_id: z.string().optional(),
  from_account_id: z.string().optional(),
  to_account_id: z.string().optional(),
  client_id: z.string().optional(),
  loan_id: z.string().optional(),
});

export const SyncToGoogleSheetInputSchema = z.object({
  sheetId: z.string().describe('The ID of the Google Sheet to sync to.'),
  transactions: z.array(TransactionSchemaForSync).describe("An array of user's transactions."),
});
export type SyncToGoogleSheetInput = z.infer<typeof SyncToGoogleSheetInputSchema>;

export const SyncToGoogleSheetOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type SyncToGoogleSheetOutput = z.infer<typeof SyncToGoogleSheetOutputSchema>;
