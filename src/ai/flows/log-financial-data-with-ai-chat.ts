'use server';
/**
 * @fileOverview This file defines a Genkit flow for logging financial data using natural language input.
 *
 * The flow takes a user's chat input, extracts relevant financial information (income, expenses, loans),
 * and returns a structured object containing the extracted data.
 *
 * @interface LogFinancialDataInput - The input type for the logFinancialData function.
 * @interface LogFinancialDataOutput - The output type for the logFinancialData function.
 * @function logFinancialData - The main function that processes the user input and calls the Genkit flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const LogFinancialDataInputSchema = z.object({
  chat_input: z
    .string()
    .describe(
      'The user input in natural language describing the financial transaction.'
    ),
  chat_history: z.string().optional().describe('The last few messages in the conversation for context.'),
});
export type LogFinancialDataInput = z.infer<typeof LogFinancialDataInputSchema>;

const LogFinancialDataOutputSchema = z.array(z.object({
  transaction_type: z
    .enum(['income', 'expense', 'loanGiven', 'loanTaken', 'repayment'])
    .describe('The type of financial transaction.'),
  category: z.string().optional().describe('The category of the transaction for income/expense.'),
  contact_id: z.string().optional().describe('The name of the person/entity for loans or repayments.'),
  client_name: z.string().optional().describe('The name of the client for income or expense transactions.'),
  amount: z.number().describe('The amount of the transaction.'),
  description: z.string().optional().describe('A description of the transaction.'),
  account_name: z.string().optional().describe("The specific name of the bank account if the user mentions one (e.g., 'savings', 'checking', 'federal')."),
}));

export type LogFinancialDataOutput = z.infer<typeof LogFinancialDataOutputSchema>;

export async function logFinancialData(input: LogFinancialDataInput): Promise<LogFinancialDataOutput> {
  return logFinancialDataFlow(input);
}

const logFinancialDataPrompt = ai.definePrompt({
  name: 'logFinancialDataPrompt',
  input: {schema: LogFinancialDataInputSchema},
  output: {schema: LogFinancialDataOutputSchema},
  prompt: `You are a financial assistant. Your task is to analyze the user's input and break it down into one or more distinct financial transactions. Extract the transaction type (income, expense, loanGiven, loanTaken, repayment), category, client name, contact, amount, description, and bank account name for each transaction. Return an array of transaction objects.

### Important Rules:
1.  **Multiple Transactions**: If a user's message implies multiple financial events, create a separate object for each one in the array.
2.  **Splitting Expenses**: If a user mentions an expense shared with other people (e.g., "food for 500 with 3 friends"), you must:
    a. Calculate the cost per person.
    b. Create an 'expense' transaction for the user's share.
    c. Create a 'loanGiven' transaction for each other person's share.
    d. Example: "I am fooded 500 with 4 members, i give loan for 3, named as Shammas, Muzail, Hakim and my money is expense."
        - Total 500 / 4 members = 125 each.
        - User's share is a 125 'expense'.
        - Create three 'loanGiven' transactions of 125 each for "Shammas", "Muzail", and "Hakim".
        - The final output should be an array of FOUR objects.
3.  **Field Assignment**:
    - For 'loanGiven', 'loanTaken', or 'repayment', the 'contact_id' field MUST contain the name of the person/entity.
    - For 'income' or 'expense', use the 'category' field for the type of transaction (e.g., 'Salary', 'Groceries', 'Freelance Work').
    - For 'income' or 'expense', if a source/company/person is mentioned (the 'who' or 'where from'), put their name in the 'client_name' field.
4.  **Client vs. Category Example**: For the input "salary get from folksdev 5000":
    - 'transaction_type' should be 'income'.
    - 'category' should be 'Salary'.
    - 'client_name' should be 'folksdev'.
    - 'amount' should be 5000.
5.  **Bank Account**: If the user mentions an account (e.g., 'from savings', 'at Federal bank'), extract only the name like 'savings' or 'federal' into the 'accountName' field. If no account is mentioned, check the chat history. Do not include the account name in the description or category.
6.  **Loan Direction**:
    - "I gave [Name] a loan", "loan given for [Name]", "lent [Name] 500" -> 'loanGiven', contact_id is '[Name]'.
    - "[Name] gave me a loan", "loan taken from [Name]", "borrowed 500 from [Name]" -> 'loanTaken', contact_id is '[Name]'.
7.  **Repayment**:
    - "repaid [Name]" or "[Name] repaid me" -> 'repayment', contact_id is '[Name]'.
8.  **Amount**: Ensure the amount is always a positive number.
9.  **Description**: If not provided, create a short, relevant summary.

### User Input:
{{{chat_input}}}

### Chat History (for context):
{{{chat_history}}}

Analyze the input and return a JSON array of all identified financial transactions.`,
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
