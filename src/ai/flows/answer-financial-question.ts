'use server';
/**
 * @fileOverview A flow for answering questions about a user's financial data.
 *
 * - answerFinancialQuestion - A function that answers questions based on provided financial data.
 * - AnswerFinancialQuestionInput - The input type for the answerFinancialQuestion function.
 * - AnswerFinancialQuestionOutput - The return type for the answerFinancialQuestion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnswerFinancialQuestionInputSchema = z.object({
  question: z.string().describe('The user\'s question about their finances.'),
  financialData: z.string().describe('A JSON string of the user\'s financial data, including transactions, debts, and bank accounts.'),
});
export type AnswerFinancialQuestionInput = z.infer<typeof AnswerFinancialQuestionInputSchema>;

export const AnswerFinancialQuestionOutputSchema = z.object({
  answer: z.string().describe('The answer to the user\'s question.'),
});
export type AnswerFinancialQuestionOutput = z.infer<typeof AnswerFinancialQuestionOutputSchema>;

export async function answerFinancialQuestion(input: AnswerFinancialQuestionInput): Promise<AnswerFinancialQuestionOutput> {
  return answerFinancialQuestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'answerFinancialQuestionPrompt',
  input: {schema: AnswerFinancialQuestionInputSchema},
  output: {schema: AnswerFinancialQuestionOutputSchema},
  prompt: `You are a helpful financial assistant. Your role is to answer questions based *only* on the financial data provided. Do not make up information. If the answer cannot be found in the data, say that you don't have that information.

User's Question: {{{question}}}

Financial Data:
\`\`\`json
{{{financialData}}}
\`\`\`

Based on the data, provide a clear and concise answer to the user's question.`,
});

const answerFinancialQuestionFlow = ai.defineFlow(
  {
    name: 'answerFinancialQuestionFlow',
    inputSchema: AnswerFinancialQuestionInputSchema,
    outputSchema: AnswerFinancialQuestionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
