'use server';
/**
 * @fileOverview This file defines a Genkit flow for routing user intent.
 * It determines whether the user wants to log financial data or ask a question.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { logFinancialData, type LogFinancialDataOutput, LogFinancialDataOutputSchema } from './log-financial-data-with-ai-chat';
import { answerFinancialQuestion, type AnswerFinancialQuestionOutput, AnswerFinancialQuestionOutputSchema } from './answer-financial-question';

const RouteUserIntentInputSchema = z.object({
  chatInput: z.string().describe('The user input in natural language.'),
  financialData: z.string().describe('A JSON string of the user\'s current financial data.'),
});
export type RouteUserIntentInput = z.infer<typeof RouteUserIntentInputSchema>;

const RouteUserIntentOutputSchema = z.union([
    z.object({ intent: z.literal('logData'), result: LogFinancialDataOutputSchema }),
    z.object({ intent: z.literal('question'), result: AnswerFinancialQuestionOutputSchema }),
]);
export type RouteUserIntentOutput = z.infer<typeof RouteUserIntentOutputSchema>;


const intentPrompt = ai.definePrompt({
    name: 'intentPrompt',
    input: { schema: z.object({ chatInput: z.string() }) },
    output: { schema: z.object({ intent: z.enum(["logData", "question"]).describe("The user's intent. Is the user asking a question or asking to log/record data?") }) },
    prompt: `Analyze the user's input to determine their intent.

User Input: {{{chatInput}}}

If the user is stating a transaction that happened (e.g., 'spent 500 on groceries', 'got my salary'), the intent is 'logData'.
If the user is asking a question (e.g., 'what's my balance?', 'how much did I spend on food?'), the intent is 'question'.`,
});


export async function routeUserIntent(input: RouteUserIntentInput): Promise<RouteUserIntentOutput> {
  const {output} = await intentPrompt({ chatInput: input.chatInput });
  const intent = output!.intent;

  if (intent === 'logData') {
    const result = await logFinancialData({ chatInput: input.chatInput });
    return { intent: 'logData', result };
  } else { // intent === 'question'
    const result = await answerFinancialQuestion({
        question: input.chatInput,
        financialData: input.financialData,
    });
    return { intent: 'question', result };
  }
}
