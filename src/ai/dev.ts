import { config } from 'dotenv';
config();

import '@/ai/flows/generate-financial-insights-with-ai.ts';
import '@/ai/flows/log-financial-data-with-ai-chat.ts';
import '@/ai/flows/answer-financial-question.ts';
import '@/ai/flows/route-user-intent-flow.ts';
import '@/ai/flows/structure-financial-data-for-sheet.ts';
import '@/ai/flows/parse-sheet-data-flow.ts';
