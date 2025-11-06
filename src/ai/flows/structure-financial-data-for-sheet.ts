'use server';
/**
 * @fileOverview A flow for structuring financial data for export to a Google Sheet.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { Transaction, Loan, BankAccount, Client } from '@/lib/types';

const StructuredFinancialDataInputSchema = z.object({
  transactions: z.string().describe("A JSON string of the user's transactions."),
  loans: z.string().describe("A JSON string of the user's loans."),
  bankAccounts: z.string().describe("A JSON string of the user's bank accounts."),
  clients: z.string().describe("A JSON string of the user's clients."),
});
export type StructuredFinancialDataInput = z.infer<typeof StructuredFinancialDataInputSchema>;

const StructuredFinancialDataOutputSchema = z.object({
  headers: z.array(z.string()).describe("The headers for the structured data."),
  rows: z.array(z.array(z.string())).describe("The rows of structured data, matching the headers."),
});
export type StructuredFinancialDataOutput = z.infer<typeof StructuredFinancialDataOutputSchema>;

export async function structureFinancialDataForSheet(input: StructuredFinancialDataInput): Promise<StructuredFinancialDataOutput> {
  return structureFinancialDataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'structureFinancialDataPrompt',
  input: { schema: StructuredFinancialDataInputSchema },
  output: { schema: StructuredFinancialDataOutputSchema },
  prompt: `You are an expert at organizing financial data. Your task is to process raw JSON data for transactions, loans, bank accounts, and clients, and then structure it into a clean, human-readable table format with headers and rows.

- The final output should contain columns for Date, Description, Category/Contact, Amount, Type, and Account.
- For 'income' and 'expense' transactions, the 'Category/Contact' column should show the transaction's category. If a client is associated, append the client name in parentheses, e.g., "Freelance (Client A)".
- For 'loanGiven' and 'loanTaken' transactions, the 'Category/Contact' column should show the name of the contact/client involved.
- The 'Amount' column should be formatted as a plain number string, without currency symbols.
- The 'Type' column should be a capitalized, user-friendly version of the transaction type (e.g., 'Loan Given').
- Map all relevant IDs to their human-readable names (e.g., 'account_id' to account name, 'client_id' to client name).

Here is the raw data:
Transactions: {{{transactions}}}
Loans: {{{loans}}}
Bank Accounts: {{{bankAccounts}}}
Clients/Contacts: {{{clients}}}

Based on this data, generate the headers and rows for the Google Sheet.
`,
});

const structureFinancialDataFlow = ai.defineFlow(
  {
    name: 'structureFinancialDataFlow',
    inputSchema: StructuredFinancialDataInputSchema,
    outputSchema: StructuredFinancialDataOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
