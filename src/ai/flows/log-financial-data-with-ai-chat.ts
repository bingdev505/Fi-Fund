'use server';
/**
 * @fileOverview This file defines a Genkit flow for logging financial data using natural language input.
 *
 * The flow takes a user's chat input, extracts relevant financial information (income, expenses, creditors, debtors),
 * and returns a structured object containing the extracted data.
 *
 * @interface LogFinancialDataInput - The input type for the logFinancialData function.
 * @interface LogFinancialDataOutput - The output type for the logFinancialData function.
 * @function logFinancialData - The main function that processes the user input and calls the Genkit flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const LogFinancialDataInputSchema = z.object({
  chatInput: z
    .string()
    .describe(
      'The user input in natural language describing the financial transaction.'
    ),
});
export type LogFinancialDataInput = z.infer<typeof LogFinancialDataInputSchema>;

const LogFinancialDataOutputSchema = z.object({
  transactionType: z
    .enum(['income', 'expense', 'creditor', 'debtor'])
    .describe('The type of financial transaction.'),
  category: z.string().describe('The category of the transaction for income/expense, or the name of the person/entity for creditor/debtor.'),
  amount: z.number().describe('The amount of the transaction.'),
  description: z.string().optional().describe('A description of the transaction.'),
  accountName: z.string().optional().describe('The name of the bank account if mentioned by the user.'),
});
export type LogFinancialDataOutput = z.infer<typeof LogFinancialDataOutputSchema>;

export async function logFinancialData(input: LogFinancialDataInput): Promise<LogFinancialDataOutput> {
  return logFinancialDataFlow(input);
}

const logFinancialDataPrompt = ai.definePrompt({
  name: 'logFinancialDataPrompt',
  input: {schema: LogFinancialDataInputSchema},
  output: {schema: LogFinancialDataOutputSchema},
  prompt: `You are a financial assistant. Extract the transaction type (income, expense, creditor, debtor), category, amount, description, and bank account name from the following user input.
For 'creditor' or 'debtor' types, the 'category' field should contain the name of the person or entity. For 'income' or 'expense' types, it should be a general category.
If the user mentions a specific bank or account name (like 'in savings', 'from my checking account', 'at HDFC bank'), extract it as 'accountName'.

User Input: {{{chatInput}}}

Ensure that the amount is a number. If a description is not explicitly provided, provide a short summary of the input.

Return the extracted information in JSON format.`,
});

const logFinancialDataFlow = ai.defineFlow(
  {
    name: 'logFinancialDataFlow',
    inputSchema: LogFinancialDataInputSchema,
    outputSchema: LogFinancialDataOutputSchema,
  },
  async input => {
    const {output} = await logFinancialDataPrompt(input);
    return output!;
  }
);
