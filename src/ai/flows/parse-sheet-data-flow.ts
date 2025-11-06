'use server';
/**
 * @fileOverview A flow for parsing raw text data from a spreadsheet into structured financial entries.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ParsedTransactionSchema = z.object({
  transaction_id: z.string().optional().describe("The unique ID of the transaction if it exists."),
  type: z.enum(['income', 'expense', 'loanGiven', 'loanTaken', 'transfer', 'repayment']),
  amount: z.number(),
  date: z.string().describe("The date of the transaction in ISO 8601 format."),
  description: z.string(),
  category: z.string().optional().describe("Category for income/expense, or contact name for loans."),
  accountName: z.string().optional().describe("The name of the primary bank account involved."),
  fromAccountName: z.string().optional().describe("The 'from' account for transfers."),
  toAccountName: z.string().optional().describe("The 'to' account for transfers."),
});

const ParseSheetDataInputSchema = z.object({
  sheetData: z.string().describe("A JSON string representation of the rows from a Google Sheet."),
  userTransactions: z.string().describe("A JSON string of the user's existing transactions for context and to avoid duplication."),
  userLoans: z.string().describe("A JSON string of the user's existing loans for context and to avoid duplication."),
  userBankAccounts: z.string().describe("A JSON string of the user's bank accounts for mapping names to IDs."),
  userClients: z.string().describe("A JSON string of the user's clients/contacts for mapping names to IDs."),
});
export type ParseSheetDataInput = z.infer<typeof ParseSheetDataInputSchema>;


const ParseSheetDataOutputSchema = z.object({
  parsedEntries: z.array(ParsedTransactionSchema).describe("An array of structured financial entries parsed from the sheet."),
});
export type ParseSheetDataOutput = z.infer<typeof ParseSheetDataOutputSchema>;


export async function parseSheetData(input: ParseSheetDataInput): Promise<ParseSheetDataOutput> {
  return parseSheetDataFlow(input);
}


const prompt = ai.definePrompt({
  name: 'parseSheetDataPrompt',
  input: { schema: ParseSheetDataInputSchema },
  output: { schema: ParseSheetDataOutputSchema },
  prompt: `You are an expert financial data processor. Your task is to parse raw data from a spreadsheet and convert it into structured financial entries.
You must identify new entries in the sheet that are not present in the user's existing data.

- Analyze the provided 'sheetData' (JSON array of arrays). The first row is headers. The first column is 'transaction_id'.
- Compare each row against the 'userTransactions' and 'userLoans' to identify new records. A record is considered new if it does NOT have a transaction_id, or its transaction_id is not found in the existing user data.
- For each new record, parse it into a structured object with fields: type, amount, date, description, category/contact, and account details.
- 'type' should be one of: 'income', 'expense', 'loanGiven', 'loanTaken', 'transfer', 'repayment'.
- 'category' should be used for income/expenses. For loans, this field should contain the contact's name.
- Map account names and client/contact names to their corresponding IDs from the provided context. If a name doesn't exist, use the name itself.
- Ensure the date is in a valid ISO 8601 format.

Sheet Data:
{{{sheetData}}}

Existing User Transactions:
{{{userTransactions}}}

Existing User Loans:
{{{userLoans}}}

User Bank Accounts:
{{{userBankAccounts}}}

User Clients/Contacts:
{{{userClients}}}

Return a JSON object containing an array of new, structured entries.
`,
});

const parseSheetDataFlow = ai.defineFlow(
  {
    name: 'parseSheetDataFlow',
    inputSchema: ParseSheetDataInputSchema,
    outputSchema: ParseSheetDataOutputSchema,
  },
  async input => {
    if (!input.sheetData || JSON.parse(input.sheetData).length < 2) {
      return { parsedEntries: [] };
    }
    const { output } = await prompt(input);
    return output!;
  }
);
