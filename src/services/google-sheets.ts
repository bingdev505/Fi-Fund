'use server';

import { google } from 'googleapis';
import type { SyncToGoogleSheetInput, SyncToGoogleSheetOutput } from '@/lib/types';

const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const SERVICE_ACCOUNT_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

async function getGoogleSheetsClient() {
    if (!SERVICE_ACCOUNT_EMAIL || !SERVICE_ACCOUNT_PRIVATE_KEY) {
        throw new Error("Google service account credentials are not set in environment variables.");
    }

    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: SERVICE_ACCOUNT_EMAIL,
            private_key: SERVICE_ACCOUNT_PRIVATE_KEY,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const authClient = await auth.getClient();
    return google.sheets({ version: 'v4', auth: authClient });
}

export async function syncTransactionsToSheet(input: SyncToGoogleSheetInput): Promise<SyncToGoogleSheetOutput> {
    try {
        const sheets = await getGoogleSheetsClient();
        const sheetName = 'Transactions';
        const range = `${sheetName}!A1`;
        
        const headers = [
            'ID', 'Date', 'Type', 'Category', 'Amount', 'Description', 
            'Account ID', 'From Account ID', 'To Account ID', 
            'Client ID', 'Loan ID', 'Project ID'
        ];

        const values = [
            headers,
            ...input.transactions.map(t => [
                t.id, t.date, t.type, t.category, t.amount, t.description,
                t.account_id || '', t.from_account_id || '', t.to_account_id || '',
                t.client_id || '', t.loan_id || '', t.project_id || ''
            ])
        ];
        
        // 1. Clear the existing sheet content to prevent old data from lingering
        try {
            await sheets.spreadsheets.values.clear({
                spreadsheetId: input.sheetId,
                range: sheetName, 
            });
        } catch (error: any) {
            if (!error.message.includes('Unable to parse range')) {
                 console.error('[Google Sheets] Error clearing sheet:', error.message);
                 // We don't re-throw here because the sheet might just be empty, which is a valid state.
            }
        }
        
        // 2. Write the new data (headers + rows)
        const result = await sheets.spreadsheets.values.update({
            spreadsheetId: input.sheetId,
            range: range,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: values,
            },
        });

        return {
            success: true,
            message: `Successfully synced ${input.transactions.length} transactions.`,
        };

    } catch (e: any) {
        console.error("Error in syncTransactionsToSheet:", e);
        if (e.message.includes('permission') || e.message.includes('PERMISSION_DENIED')) {
             return { success: false, message: 'Permission denied. Please ensure the service account has Editor access to the Google Sheet.' };
        }
        return { success: false, message: e.message || 'Failed to sync with Google Sheet.' };
    }
}
