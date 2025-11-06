'use server';
/**
 * @fileOverview A flow for structuring financial data for export to a Google Sheet.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const StructuredFinancialDataInputSchema = z.object({
  transactions: z.string().describe("A JSON string of the user's transactions."),
  loans: z.string().describe("A JSON string of the user's loans."),
  bankAccounts: z.string().describe("A JSON string of the user's bank accounts."),
  clients: z.string().describe("A JSON string of the user's clients."),
  contacts: z.string().describe("A JSON string of the user's personal contacts."),
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
  prompt: `You are an expert at organizing financial data. Your task is to process raw JSON data for transactions, loans, bank accounts, and contacts, and then structure it into a clean, human-readable table format with headers and rows.

- The final output **must** contain these exact columns in this exact order: **Date, Type, Account, Category/Contact, Amount**.
- For 'income' and 'expense' transactions, the 'Category/Contact' column should show the transaction's category.
- For 'loanGiven', 'loanTaken', and 'repayment' transactions, the 'Category/Contact' column should show the name of the contact involved.
- Map all relevant IDs to their human-readable names (e.g., 'account_id' to account name, 'client_id' or 'contact_id' to the person's name).
- The 'Type' column should be a capitalized, user-friendly version of the transaction type (e.g., 'Loan Given', 'Repayment').

**Crucially, format the 'Amount' column based on these rules:**
- **loanGiven**: The amount should be **negative** (e.g., -5000).
- **repayment** on a **loanGiven**: The amount should be **positive** (e.g., 500).
- **loanTaken**: The amount should be **positive** (e.g., 10000).
- **repayment** on a **loanTaken**: The amount should be **negative** (e.g., -1000).
- **income**: The amount should be **positive**.
- **expense**: The amount should be **negative**.
- **transfer**: The amount should be **positive**.

- The 'Amount' column should be formatted as a plain number string, without currency symbols.

Here is the raw data:
Transactions: {{{transactions}}}
Loans: {{{loans}}}
Bank Accounts: {{{bankAccounts}}}
Clients: {{{clients}}}
Contacts: {{{contacts}}}


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
