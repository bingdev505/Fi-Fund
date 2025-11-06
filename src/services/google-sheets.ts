'use server';

import { google } from 'googleapis';
import type { SyncToGoogleSheetInput, SyncToGoogleSheetOutput, Transaction, Loan } from '@/lib/types';
import { structureFinancialDataForSheet } from '@/ai/flows/structure-financial-data-for-sheet';
import { parseSheetData } from '@/ai/flows/parse-sheet-data-flow';
import { supabase } from '@/lib/supabase_client';
import { getOAuth2Client } from './google-auth';

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

            if (new Date(creds.expiry_date) < new Date()) {
                const { credentials } = await oauth2Client.refreshAccessToken();
                 await supabase.from('user_google_credentials').update({
                    access_token: credentials.access_token,
                    refresh_token: credentials.refresh_token || creds.refresh_token,
                    scope: credentials.scope,
                    token_type: credentials.token_type,
                    expiry_date: credentials.expiry_date,
                }).eq('user_id', userId);
                oauth2Client.setCredentials(credentials);
            }
            return google.sheets({ version: 'v4', auth: oauth2Client });
        }
    }

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

async function readFromSheet(sheets: any, sheetId: string, sheetName: string): Promise<any[][] | null> {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: sheetName,
        });
        return response.data.values;
    } catch (error: any) {
        if (error.message.includes('Unable to parse range')) {
            return null; // Sheet or range doesn't exist, which is fine.
        }
        throw error;
    }
}

async function writeToSheet(sheets: any, sheetId: string, sheetName: string, values: any[][]) {
     try {
        await sheets.spreadsheets.values.clear({
            spreadsheetId: sheetId,
            range: sheetName, 
        });
    } catch (error: any) {
        if (!error.message.includes('Unable to parse range')) {
             console.warn('[Google Sheets] Could not clear sheet, may not exist yet:', error.message);
        }
    }
    
    await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: values,
        },
    });
}


export async function syncTransactionsToSheet(input: SyncToGoogleSheetInput): Promise<SyncToGoogleSheetOutput> {
    try {
        const sheets = await getGoogleSheetsClient(input.userId);
        const sheetName = 'Sheet1'; 
        let transactions = input.transactions;
        let loans = input.loans;

        // Two-way sync: Read from sheet first
        if (input.readFromSheet) {
            const sheetData = await readFromSheet(sheets, input.sheetId, sheetName);
            if (sheetData && sheetData.length > 1) { // More than just a header
                const parsedResult = await parseSheetData({
                    sheetData: JSON.stringify(sheetData),
                    userTransactions: JSON.stringify(input.transactions),
                    userLoans: JSON.stringify(input.loans),
                    userBankAccounts: JSON.stringify(input.bankAccounts),
                    userClients: JSON.stringify([...input.clients, ...input.contacts]),
                });

                for (const entry of parsedResult.parsedEntries) {
                    const dbEntry = {
                        user_id: input.userId!,
                        amount: entry.amount,
                        description: entry.description,
                        date: entry.date,
                        created_at: entry.date,
                    };
                    
                    const account = input.bankAccounts.find(acc => acc.name.toLowerCase() === entry.accountName?.toLowerCase());

                    if (entry.type === 'income' || entry.type === 'expense') {
                         const newTx: Transaction = {
                            ...dbEntry,
                            id: '',
                            type: entry.type,
                            category: entry.category || 'Uncategorized',
                            account_id: account?.id,
                         };
                         const { data, error } = await supabase.from('transactions').insert(newTx).select().single();
                         if (!error && data) transactions.push(data);

                    } else if (entry.type === 'loanGiven' || entry.type === 'loanTaken') {
                        const contact = [...input.clients, ...input.contacts].find(c => c.name.toLowerCase() === entry.category?.toLowerCase());
                        const newLoan: Loan = {
                            ...dbEntry,
                            id: '',
                            type: entry.type,
                            contact_id: contact?.id || entry.category!,
                            status: 'active',
                            account_id: account?.id!,
                        };
                         const { data, error } = await supabase.from('loans').insert(newLoan).select().single();
                         if (!error && data) loans.push(data);
                    }
                }
            }
        }
        
        const structuredData = await structureFinancialDataForSheet({
            transactions: JSON.stringify(transactions),
            loans: JSON.stringify(loans),
            bankAccounts: JSON.stringify(input.bankAccounts),
            clients: JSON.stringify([...input.clients, ...input.contacts]),
        });

        const values = [
            structuredData.headers,
            ...structuredData.rows
        ];
        
        await writeToSheet(sheets, input.sheetId, sheetName, values);
       
        return {
            success: true,
            message: `Successfully synced ${transactions.length} transactions and ${loans.length} loans.`,
        };

    } catch (e: any) {
        console.error("Error in syncTransactionsToSheet:", e);
        if (e.message.includes('permission') || e.message.includes('PERMISSION_DENIED')) {
             return { success: false, message: 'Permission denied. Please ensure the service account or your connected Google account has Editor access to the Google Sheet.' };
        }
        return { success: false, message: e.message || 'Failed to sync with Google Sheet.' };
    }
}
