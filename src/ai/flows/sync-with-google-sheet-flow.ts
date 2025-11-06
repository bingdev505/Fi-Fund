'use server';
/**
 * @fileOverview A flow for syncing financial data to a Google Sheet.
 */

import { ai } from '@/ai/genkit';
import { updateGoogleSheet } from '@/ai/tools/google-sheets';
import { SyncToGoogleSheetInputSchema, SyncToGoogleSheetOutputSchema, type SyncToGoogleSheetInput, type SyncToGoogleSheetOutput } from '@/lib/types';


export async function syncToGoogleSheet(input: SyncToGoogleSheetInput): Promise<SyncToGoogleSheetOutput> {
  return syncToGoogleSheetFlow(input);
}

const syncToGoogleSheetFlow = ai.defineFlow(
  {
    name: 'syncToGoogleSheetFlow',
    inputSchema: SyncToGoogleSheetInputSchema,
    outputSchema: SyncToGoogleSheetOutputSchema,
  },
  async (input) => {
    try {
        await updateGoogleSheet({
            sheetId: input.sheetId,
            range: 'Sheet1!A1',
            values: [["Connection successful! Full sync coming soon."]]
        });
        return { success: true, message: 'Successfully connected to Google Sheet. Full sync is being implemented.' };
    } catch (e: any) {
        console.error("Error in syncToGoogleSheetFlow tool call:", e);
        if (e.message.includes('permission')) {
             return { success: false, message: 'Permission denied. Please ensure the service account has Editor access to the Google Sheet.' };
        }
        return { success: false, message: e.message || 'Failed to sync with Google Sheet.' };
    }
  }
);
