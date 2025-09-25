'use server';

import { generateFinancialInsights as generateFinancialInsightsFlow } from '@/ai/flows/generate-financial-insights-with-ai';
import { logFinancialData as logFinancialDataFlow } from '@/ai/flows/log-financial-data-with-ai-chat';
import type { GenerateFinancialInsightsInput, GenerateFinancialInsightsOutput } from '@/ai/flows/generate-financial-insights-with-ai';
import type { LogFinancialDataInput, LogFinancialDataOutput } from '@/ai/flows/log-financial-data-with-ai-chat';

export async function generateFinancialInsights(input: GenerateFinancialInsightsInput): Promise<GenerateFinancialInsightsOutput> {
  return await generateFinancialInsightsFlow(input);
}

export async function logFinancialData(input: LogFinancialDataInput): Promise<LogFinancialDataOutput> {
  return await logFinancialDataFlow(input);
}
