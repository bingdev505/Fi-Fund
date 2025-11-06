'use server';
/**
 * @fileOverview A flow for syncing financial data to a Google Sheet.
 */

import { ai } from '@/ai/genkit';
import { updateGoogleSheet } from '@/ai/tools/google-sheets';
import { z } from 'genkit';

const TransactionSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  project_id: z.string().optional(),
  type: z.enum(['income', 'expense', 'transfer', 'repayment']),
  category: z.string(),
  amount: z.number(),
  description: z.string(),
  date: z.string(),
  account_id: z.string().optional(),
  from_account_id: z.string().optional(),
  to_account_id: z.string().optional(),
  client_id: z.string().optional(),
  loan_id: z.string().optional(),
});

export const SyncToGoogleSheetInputSchema = z.object({
  sheetId: z.string().describe('The ID of the Google Sheet to sync to.'),
  transactions: z.array(TransactionSchema).describe("An array of user's transactions."),
});
export type SyncToGoogleSheetInput = z.infer<typeof SyncToGoogleSheetInputSchema>;

export const SyncToGoogleSheetOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type SyncToGoogleSheetOutput = z.infer<typeof SyncToGoogleSheetOutputSchema>;

export async function syncToGoogleSheet(input: SyncToGoogleSheetInput): Promise<SyncToGoogleSheetOutput> {
  return syncToGoogleSheetFlow(input);
}

const syncToGoogleSheetFlow = ai.defineFlow(
  {
    name: 'syncToGoogleSheetFlow',
    inputSchema: SyncToGoogleSheetInputSchema,
    outputSchema: SyncToGoogleSheetOutputSchema,
    tools: [updateGoogleSheet],
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
            range: 'A1', // Start at the beginning of the sheet
            values: [headers, ...rows]
        });
        return { success: true, message: 'Successfully synced transactions to Google Sheet.' };
    } catch (e: any) {
        console.error("Error in syncToGoogleSheetFlow tool call:", e);
        return { success: false, message: e.message || 'Failed to sync with Google Sheet.' };
    }
  }
);
