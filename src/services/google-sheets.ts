'use server';

import { google } from 'googleapis';
import type { SyncToGoogleSheetInput, SyncToGoogleSheetOutput } from '@/lib/types';

// This is a placeholder for a more robust credential management system
const serviceAccountCreds = {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
}

async function getGoogleSheetsClient() {
    if (!serviceAccountCreds.client_email || !serviceAccountCreds.private_key) {
        throw new Error("Google service account credentials are not set in environment variables.");
    }
    
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: serviceAccountCreds.client_email,
            private_key: serviceAccountCreds.private_key,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const authClient = await auth.getClient();
    return google.sheets({ version: 'v4', auth: authClient });
}

export async function syncTransactionsToSheet(input: SyncToGoogleSheetInput): Promise<SyncToGoogleSheetOutput> {
    try {
        const sheets = await getGoogleSheetsClient();
        const sheetName = 'Transactions'; // Default sheet name
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
            // This error can happen if the sheet doesn't exist yet, which is fine.
            // We'll proceed to try and write to it, which will create it if needed.
            if (!error.message.includes('Unable to parse range')) {
                 console.error('[Google Sheets] Could not clear sheet, may not exist yet:', error.message);
            }
        }
        
        // 2. Write the new data (headers + rows)
        await sheets.spreadsheets.values.update({
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
