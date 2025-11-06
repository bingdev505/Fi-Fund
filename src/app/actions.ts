'use server';

import { generateFinancialInsights as generateFinancialInsightsFlow } from '@/ai/flows/generate-financial-insights-with-ai';
import { routeUserIntent as routeUserIntentFlow } from '@/ai/flows/route-user-intent-flow';
import type { GenerateFinancialInsightsInput, GenerateFinancialInsightsOutput } from '@/ai/flows/generate-financial-insights-with-ai';
import type { RouteUserIntentInput, RouteUserIntentOutput } from '@/ai/flows/route-user-intent-flow';
import type { SyncToGoogleSheetInput, SyncToGoogleSheetOutput } from '@/lib/types';
import { syncTransactionsToSheet } from '@/services/google-sheets';


export async function generateFinancialInsights(input: GenerateFinancialInsightsInput): Promise<GenerateFinancialInsightsOutput> {
  return await generateFinancialInsightsFlow(input);
}

export async function routeUserIntent(input: RouteUserIntentInput): Promise<RouteUserIntentOutput> {
  return await routeUserIntentFlow(input);
}

export async function syncToGoogleSheet(input: SyncToGoogleSheetInput): Promise<SyncToGoogleSheetOutput> {
    return await syncTransactionsToSheet(input);
}
