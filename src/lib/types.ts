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
  date: LocalTimestamp;
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
const TransactionSchemaForSync = z.custom<Transaction>();
const LoanSchemaForSync = z.custom<Loan>();
const BankAccountSchemaForSync = z.custom<BankAccount>();
const ClientSchemaForSync = z.custom<Client>();
const ContactSchemaForSync = z.custom<Contact>();


export const SyncToGoogleSheetInputSchema = z.object({
  sheetId: z.string().describe('The ID of the Google Sheet to sync to.'),
  userId: z.string().optional().describe('The ID of the user performing the sync for OAuth credentials.'),
  transactions: z.array(TransactionSchemaForSync).describe("An array of user's transactions."),
  loans: z.array(LoanSchemaForSync).describe("An array of user's loans."),
  bankAccounts: z.array(BankAccountSchemaForSync).describe("An array of user's bank accounts."),
  clients: z.array(ClientSchemaForSync).describe("An array of user's clients."),
  contacts: z.array(ContactSchemaForSync).describe("An array of user's personal contacts."),
  readFromSheet: z.boolean().default(true).describe("Whether to read data from the sheet and add it to the database."),
});
export type SyncToGoogleSheetInput = z.infer<typeof SyncToGoogleSheetInputSchema>;

export const SyncToGoogleSheetOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type SyncToGoogleSheetOutput = z.infer<typeof SyncToGoogleSheetOutputSchema>;
