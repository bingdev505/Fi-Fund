'use server';

import { google } from 'googleapis';
import type { SyncToGoogleSheetInput, SyncToGoogleSheetOutput } from '@/lib/types';

async function getGoogleSheetsClient() {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;

    if (!email || !privateKey) {
        throw new Error("Google service account credentials are not set in environment variables.");
    }

    const client = new google.auth.JWT(
        email,
        undefined,
        privateKey.replace(/\\n/g, '\n'),
        ['https://www.googleapis.com/auth/spreadsheets']
    );

    await client.authorize();
    
    return google.sheets({ version: 'v4', auth: client });
}


export async function syncTransactionsToSheet(input: SyncToGoogleSheetInput): Promise<SyncToGoogleSheetOutput> {
    try {
        const sheets = await getGoogleSheetsClient();
        const sheetName = 'Sheet1'; // Default sheet name
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
        
        try {
            await sheets.spreadsheets.values.clear({
                spreadsheetId: input.sheetId,
                range: sheetName, 
            });
        } catch (error: any) {
            if (!error.message.includes('Unable to parse range')) {
                 console.warn('[Google Sheets] Could not clear sheet, may not exist yet:', error.message);
            }
        }
        
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
