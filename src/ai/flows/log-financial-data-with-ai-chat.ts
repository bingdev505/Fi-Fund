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
  chatHistory: z.string().optional().describe('The last few messages in the conversation for context.'),
});
export type LogFinancialDataInput = z.infer<typeof LogFinancialDataInputSchema>;

const LogFinancialDataOutputSchema = z.object({
  transactionType: z
    .enum(['income', 'expense', 'creditor', 'debtor'])
    .describe('The type of financial transaction.'),
  category: z.string().describe('The category of the transaction for income/expense, or the name of the person/entity for creditor/debtor.'),
  amount: z.number().describe('The amount of the transaction.'),
  description: z.string().optional().describe('A description of the transaction.'),
  accountName: z.string().optional().describe("The specific name of the bank account if the user mentions one (e.g., 'savings', 'checking', 'federal')."),
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
- If the user explicitly starts their message with 'income', 'expense', 'creditor', or 'debtor', use that as the transaction type.
- For 'creditor' or 'debtor' types, the 'category' field should contain the name of the person or entity. For 'income' or 'expense' types, it should be a general category.
- If the user mentions a specific bank or account name (e.g., 'in savings', 'from my checking account', 'at Federal bank', 'to gramin', 'Federal salary'), extract it as 'accountName'. 
- Only extract the name of the account, like 'savings', 'checking', 'federal', or 'gramin'. Do not include the account name in the category or description.
- A bank name can sometimes appear at the very beginning of the input.
- If the user does *not* specify a bank account in their latest message, look at the chat history to see if a bank account was mentioned recently. If so, use that account name.
- For loans, if the user says "[Name] give me loan", it means the user owes money to [Name], so the transactionType is 'creditor'. If the user says "I gave [Name] a loan", it means the user is owed money by [Name], so the transactionType is 'debtor'.

User Input: {{{chatInput}}}

Chat History:
{{{chatHistory}}}

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

    