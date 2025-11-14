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

const TransactionObjectSchema = z.object({
    transaction_type: z
      .enum(['income', 'expense', 'loanGiven', 'loanTaken', 'repayment'])
      .describe('The type of financial transaction.'),
    category: z.string().optional().describe('The category of the transaction for income/expense.'),
    contact_id: z.string().optional().describe('The name of the person/entity for loans or repayments.'),
    client_name: z.string().optional().describe('The name of the client for income or expense transactions.'),
    amount: z.number().describe('The amount of the transaction.'),
    description: z.string().optional().describe('A description of the transaction.'),
    account_name: z.string().optional().describe("The specific name of the bank account if the user mentions one (e.g., 'savings', 'checking', 'federal')."),
});

const LogFinancialDataOutputSchema = z.object({
    result: z.union([
        z.array(TransactionObjectSchema),
        z.object({
            clarification_needed: z.string().describe("A question to ask the user to clarify their request if the input is ambiguous or incomplete.")
        })
    ]).describe("Either an array of transactions or an object asking for clarification.")
});


export type LogFinancialDataOutput = z.infer<typeof LogFinancialDataOutputSchema>;

export async function logFinancialData(input: LogFinancialDataInput): Promise<LogFinancialDataOutput> {
  return logFinancialDataFlow(input);
}

const logFinancialDataPrompt = ai.definePrompt({
  name: 'logFinancialDataPrompt',
  input: {schema: LogFinancialDataInputSchema},
  output: {schema: LogFinancialDataOutputSchema},
  prompt: `You are a financial assistant. Your primary task is to analyze the user's input and break it down into one or more distinct financial transactions.

### CRITICAL RULES:
1.  **Clarity is Key**: If the user's input is ambiguous or missing information needed to create a complete transaction, you MUST ask a clarifying question. Do NOT make assumptions.
    -   **Ambiguous loan**: "paid shammas" -> Ask: "Is this a repayment for a loan you took, or for something else?"
    -   **Missing amount/person**: "split lunch with friends" -> Ask: "How much was the total bill and who was there?"
    -   **Unclear split**: "bill 1000, I paid with 2 friends" -> Ask: "How should the 1000 be split? Was it split equally, or did you cover a different amount?"
    -   If you need to ask a question, use the 'clarification_needed' field in your response.

2.  **Multiple Transactions**: If a user's message implies multiple financial events, create a separate object for each one in the array.
3.  **Splitting Expenses**: If a user mentions an expense shared with other people (e.g., "food for 500 with 3 friends"), you must:
    a. Calculate the cost per person.
    b. Create an 'expense' transaction for the user's share.
    c. Create a 'loanGiven' transaction for each other person's share.
    d. Example: "I am fooded 500 with 4 members, i give loan for 3, named as Shammas, Muzail, Hakim and my money is expense."
        - Total 500 / 4 members = 125 each.
        - User's share is a 125 'expense'.
        - Create three 'loanGiven' transactions of 125 each for "Shammas", "Muzail", and "Hakim".
        - The final 'result' should be an array of FOUR transaction objects.
4.  **Field Assignment**:
    - For 'loanGiven', 'loanTaken', or 'repayment', the 'contact_id' field MUST contain the name of the person/entity.
    - For 'income' or 'expense', use the 'category' field for the type of transaction (e.g., 'Salary', 'Groceries').
    - For 'income' or 'expense', if a source/company/person is mentioned (the 'who' or 'where from'), put their name in the 'client_name' field.
5.  **Client vs. Category Example**: For the input "salary get from folksdev 5000":
    - 'transaction_type' should be 'income'.
    - 'category' should be 'Salary'.
    - 'client_name' should be 'folksdev'.
    - 'amount' should be 5000.
6.  **Bank Account**: If the user mentions an account (e.g., 'from savings', 'at Federal bank'), extract only the name like 'savings' or 'federal' into the 'accountName' field. If no account is mentioned, check the chat history. Do not include the account name in the description or category.
7.  **Loan Direction**:
    - "I gave [Name] a loan", "loan given for [Name]", "lent [Name] 500" -> 'loanGiven', contact_id is '[Name]'.
    - "[Name] gave me a loan", "loan taken from [Name]", "borrowed 500 from [Name]" -> 'loanTaken', contact_id is '[Name]'.
8.  **Repayment**:
    - "repaid [Name]" or "[Name] repaid me" -> 'repayment', contact_id is '[Name]'.
9.  **Amount**: Ensure the amount is always a positive number.
10. **Description**: If not provided, create a short, relevant summary.

### User Input:
{{{chat_input}}}

### Chat History (for context):
{{{chat_history}}}

Analyze the input. If you are certain, return a JSON object with a 'result' field containing an array of all identified financial transactions. If you are uncertain, return a 'result' object with a 'clarification_needed' field containing your question to the user.`,
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
