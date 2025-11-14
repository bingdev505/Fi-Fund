'use server';
/**
 * @fileOverview This file defines a Genkit flow for routing user intent.
 * It determines whether the user wants to log financial data, ask a question, or issue a command.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { logFinancialData, type LogFinancialDataOutput } from './log-financial-data-with-ai-chat';
import { answerFinancialQuestion, type AnswerFinancialQuestionOutput } from './answer-financial-question';

const RouteUserIntentInputSchema = z.object({
  chat_input: z.string().describe('The user input in natural language.'),
  financial_data: z.string().describe('A JSON string of the user\'s current financial data.'),
  chat_history: z.string().optional().describe('The last few messages in the conversation for context.'),
});
export type RouteUserIntentInput = z.infer<typeof RouteUserIntentInputSchema>;

// Re-define the schemas here since we can't import them from 'use server' files.
const TransactionObjectSchema = z.object({
  transaction_type: z.enum(['income', 'expense', 'loanGiven', 'loanTaken', 'repayment']),
  category: z.string().optional(),
  contact_id: z.string().optional(),
  client_name: z.string().optional(),
  amount: z.number(),
  description: z.string().optional(),
  account_name: z.string().optional(),
});

const LogFinancialDataResultSchema = z.object({
    result: z.union([
        z.array(TransactionObjectSchema),
        z.object({
            clarification_needed: z.string()
        })
    ])
});


const AnswerFinancialQuestionResultSchema = z.object({
  answer: z.string(),
});

const CommandResultSchema = z.object({
    response: z.string(),
});


const RouteUserIntentOutputSchema = z.union([
    z.object({ intent: z.literal('logData'), result: LogFinancialDataResultSchema as z.ZodType<LogFinancialDataOutput> }),
    z.object({ intent: z.literal('question'), result: AnswerFinancialQuestionResultSchema as z.ZodType<AnswerFinancialQuestionOutput> }),
    z.object({ intent: z.literal('command'), result: CommandResultSchema }),
]);
export type RouteUserIntentOutput = z.infer<typeof RouteUserIntentOutputSchema>;


const intentPrompt = ai.definePrompt({
    name: 'intentPrompt',
    input: { schema: z.object({ chat_input: z.string() }) },
    output: { schema: z.object({ intent: z.enum(["logData", "question", "command"]).describe("The user's intent: is the user logging data, asking a question, or giving a command?") }) },
    prompt: `Analyze the user's input to determine the primary intent. Categorize it as 'logData', 'question', 'command'.

- 'logData': The user is stating a transaction or financial event that has occurred.
  Examples: "spent 500 on groceries", "got my salary", "income 1000 from freelance", "John owes me 50", "repaid John 20", "lunch 800 with 3 friends, i owe them".

- 'question': The user is asking for information about their finances.
  Examples: "what's my balance?", "how much did I spend on food?", "show me my loans".

- 'command': The user is telling the system to perform an action like deleting or editing.
  Examples: "delete the last entry", "remove that transaction", "edit the lunch expense".

User Input: {{{chat_input}}}

Based on the keywords and structure, determine the most likely intent.`,
});


const routeUserIntentFlow = ai.defineFlow(
  {
    name: 'routeUserIntentFlow',
    inputSchema: RouteUserIntentInputSchema,
    outputSchema: RouteUserIntentOutputSchema,
  },
  async (input) => {
    let output;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const response = await intentPrompt({ chat_input: input.chat_input });
        output = response.output;
        break; // Success, exit loop
      } catch (e: any) {
        attempts++;
        if (attempts >= maxAttempts) {
          console.error("AI flow failed after multiple retries:", e);
          throw new Error("The AI service is currently unavailable. Please try again later.");
        }
        console.log(`AI call failed, attempt ${attempts}. Retrying in ${attempts}s...`);
        await new Promise(res => setTimeout(res, attempts * 1000));
      }
    }

    const intent = output!.intent;

    if (intent === 'logData') {
        const result = await logFinancialData({ chat_input: input.chat_input, chat_history: input.chat_history });
        return { intent: 'logData', result };
    } else if (intent === 'question') {
        const result = await answerFinancialQuestion({
            question: input.chat_input,
            financial_data: input.financial_data,
        });
        return { intent: 'question', result };
    } else { // intent === 'command'
        return {
            intent: 'command',
            result: {
                response: "To edit or delete an entry, please hover over the message and use the pencil or trash can icons that appear."
            }
        };
    }
  }
);


export async function routeUserIntent(input: RouteUserIntentInput): Promise<RouteUserIntentOutput> {
    return routeUserIntentFlow(input);
}
