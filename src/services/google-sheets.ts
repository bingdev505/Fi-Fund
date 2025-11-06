'use server';

import { google } from 'googleapis';
import type { SyncToGoogleSheetInput, SyncToGoogleSheetOutput } from '@/lib/types';
import { structureFinancialDataForSheet } from '@/ai/flows/structure-financial-data-for-sheet';
import { useFinancials } from '@/hooks/useFinancials';
import { supabase } from '@/lib/supabase_client';
import { getOAuth2Client } from './google-auth';
import { headers } from 'next/headers';

async function getGoogleSheetsClient(userId?: string) {
    if (userId) {
        const { data: creds, error } = await supabase.from('user_google_credentials').select('*').eq('user_id', userId).single();
        if (!error && creds) {
            const oauth2Client = getOAuth2Client();
            oauth2Client.setCredentials({
                access_token: creds.access_token,
                refresh_token: creds.refresh_token,
                scope: creds.scope,
                token_type: creds.token_type,
                expiry_date: creds.expiry_date,
            });

            // Check if token is expired and refresh if needed
            if (new Date(creds.expiry_date) < new Date()) {
                const { credentials } = await oauth2Client.refreshAccessToken();
                 await supabase.from('user_google_credentials').update({
                    access_token: credentials.access_token,
                    refresh_token: credentials.refresh_token || creds.refresh_token, // keep old refresh token if new one not provided
                    scope: credentials.scope,
                    token_type: credentials.token_type,
                    expiry_date: credentials.expiry_date,
                }).eq('user_id', userId);
                oauth2Client.setCredentials(credentials);
            }
            return google.sheets({ version: 'v4', auth: oauth2Client });
        }
    }


    // Fallback to service account
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
        const sheets = await getGoogleSheetsClient(input.userId);
        const sheetName = 'Sheet1'; 
        const range = `${sheetName}!A1`;
        
        const structuredData = await structureFinancialDataForSheet({
            transactions: JSON.stringify(input.transactions),
            loans: JSON.stringify(input.loans),
            bankAccounts: JSON.stringify(input.bankAccounts),
            clients: JSON.stringify(input.clients),
        });

        const values = [
            structuredData.headers,
            ...structuredData.rows
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
             return { success: false, message: 'Permission denied. Please ensure the service account or your connected Google account has Editor access to the Google Sheet.' };
        }
        return { success: false, message: e.message || 'Failed to sync with Google Sheet.' };
    }
}
