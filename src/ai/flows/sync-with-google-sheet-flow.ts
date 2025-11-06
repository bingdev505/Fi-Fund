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
    const headers = [
        "ID", "Date", "Type", "Category", "Amount", "Description", 
        "Account ID", "From Account ID", "To Account ID", "Client ID", "Loan ID", "Project ID"
    ];

    const rows = input.transactions.map(t => [
        t.id, t.date, t.type, t.category, t.amount, t.description,
        t.account_id || '', t.from_account_id || '', t.to_account_id || '', 
        t.client_id || '', t.loan_id || '', t.project_id || ''
    ]);

    try {
        await updateGoogleSheet({
            sheetId: input.sheetId,
            range: 'Sheet1!A1', // Write to 'Sheet1' starting at A1
            values: [headers, ...rows]
        });
        return { success: true, message: 'Successfully synced transactions to Google Sheet.' };
    } catch (e: any) {
        console.error("Error in syncToGoogleSheetFlow tool call:", e);
        if (e.message.includes('permission')) {
             return { success: false, message: 'Permission denied. Please ensure the service account has Editor access to the Google Sheet.' };
        }
        return { success: false, message: e.message || 'Failed to sync with Google Sheet.' };
    }
  }
);
