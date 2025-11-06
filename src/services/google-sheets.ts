'use server';

import { google } from 'googleapis';
import type { SyncToGoogleSheetInput, SyncToGoogleSheetOutput } from '@/lib/types';
import { getOAuth2Client } from './google-auth';
import { supabase } from '@/lib/supabase_client';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';


async function getGoogleSheetsClient() {
    const cookieStore = cookies();
    const supabaseServer = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
            },
        }
    );

    const { data: { user } } = await supabaseServer.auth.getUser();

    if (!user) {
        throw new Error('User not authenticated to access Google Sheets.');
    }

    const { data: creds, error } = await supabase
        .from('user_google_credentials')
        .select('*')
        .eq('user_id', user.id)
        .single();
    
    if (error || !creds) {
        throw new Error('Google credentials not found for user. Please connect your Google account.');
    }

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
        access_token: creds.access_token,
        refresh_token: creds.refresh_token,
        expiry_date: new Date(creds.expiry_date).getTime(),
    });

    // Handle token refresh if necessary
    const isTokenExpired = new Date(creds.expiry_date) < new Date();
    if (isTokenExpired) {
        const { credentials } = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(credentials);

        // Update the database with the new tokens
        await supabase
            .from('user_google_credentials')
            .update({
                access_token: credentials.access_token,
                refresh_token: credentials.refresh_token,
                expiry_date: new Date(credentials.expiry_date!).toISOString(),
            })
            .eq('user_id', user.id);
    }
    
    return google.sheets({ version: 'v4', auth: oauth2Client });
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
        
        try {
            await sheets.spreadsheets.values.clear({
                spreadsheetId: input.sheetId,
                range: sheetName, 
            });
        } catch (error: any) {
            if (!error.message.includes('Unable to parse range')) {
                 console.error('[Google Sheets] Could not clear sheet, may not exist yet:', error.message);
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
             return { success: false, message: 'Permission denied. Please ensure your account has Editor access to the Google Sheet.' };
        }
        return { success: false, message: e.message || 'Failed to sync with Google Sheet.' };
    }
}
