'use server';

import { google } from 'googleapis';
import type { SyncToGoogleSheetInput, SyncToGoogleSheetOutput, Transaction, Loan, Contact, Client, BankAccount } from '@/lib/types';
import { supabase } from '@/lib/supabase_client';
import { getOAuth2Client } from './google-auth';

type StructuredRow = (string | number | null)[];
const TRANSACTIONS_SHEET_NAME = 'Transactions';
const DATA_SHEET_NAME = 'Data';


function structureDataForSheet(
    transactions: Transaction[],
    loans: Loan[],
    bankAccounts: BankAccount[],
    allContacts: (Client | Contact)[]
): { transactionHeaders: string[], transactionRows: StructuredRow[] } {
    const transactionHeaders = ["transaction_id", "Date", "Type", "Account", "Category", "Contact/Client", "Description", "Amount"];
    
    const accountMap = new Map(bankAccounts.map(acc => [acc.id, acc.name]));
    const contactMap = new Map(allContacts.map(c => [c.id, c.name]));

    const processedRows: StructuredRow[] = [];

    transactions.forEach(tx => {
        if (tx.type === 'transfer') {
            const fromAccountName = accountMap.get(tx.from_account_id || '') || 'Unknown';
            const toAccountName = accountMap.get(tx.to_account_id || '') || 'Unknown';
            processedRows.push([
                tx.id + '_from', new Date(tx.date).toLocaleDateString('en-CA'), 'Transfer Out', fromAccountName, 'Bank Transfer', '', tx.description || `Transfer to ${toAccountName}`, -Math.abs(tx.amount)
            ]);
            processedRows.push([
                tx.id + '_to', new Date(tx.date).toLocaleDateString('en-CA'), 'Transfer In', toAccountName, 'Bank Transfer', '', tx.description || `Transfer from ${fromAccountName}`, Math.abs(tx.amount)
            ]);
        } else {
            let amount = tx.amount;
            let type = tx.type.charAt(0).toUpperCase() + tx.type.slice(1);
            let contact = tx.client_id ? contactMap.get(tx.client_id) : '';
            let description = tx.description || '';

            if (tx.type === 'repayment' && tx.loan_id) {
                 const relatedLoan = loans.find(l => l.id === tx.loan_id);
                 contact = relatedLoan ? contactMap.get(relatedLoan.contact_id) : '';
                 description = `Repayment for loan regarding ${contact}`;
                 amount = relatedLoan?.type === 'loanGiven' ? Math.abs(amount) : -Math.abs(amount);
            } else if (tx.type === 'income') {
                amount = Math.abs(amount);
            } else {
                amount = -Math.abs(amount);
            }

            processedRows.push([ tx.id, new Date(tx.date).toLocaleDateString('en-CA'), type, accountMap.get(tx.account_id || '') || '', tx.category, contact, description, amount ]);
        }
    });

    loans.forEach(loan => {
        const type = loan.type === 'loanGiven' ? 'Loan Given' : 'Loan Taken';
        const amount = loan.type === 'loanGiven' ? -Math.abs(loan.amount) : Math.abs(loan.amount);
        processedRows.push([ loan.id, new Date(loan.date || loan.created_at).toLocaleDateString('en-CA'), type, accountMap.get(loan.account_id) || '', 'Loan', contactMap.get(loan.contact_id) || 'Unknown Contact', loan.description || '', amount ]);
    });

    const sortedRows = processedRows.sort((a, b) => new Date(a[1] as string).getTime() - new Date(b[1] as string).getTime());

    return { transactionHeaders, transactionRows: sortedRows };
}

type ParsedSheetData = {
    newTransactions: Omit<Transaction, 'id' | 'user_id'>[];
    updatedTransactions: Partial<Transaction> & { id: string }[];
    newLoans: Omit<Loan, 'id' | 'user_id' | 'created_at'>[];
    updatedLoans: Partial<Loan> & { id: string }[];
};

function parseSheetData(
    sheetData: any[][],
    userTransactions: Transaction[],
    userLoans: Loan[],
    contactMap: Map<string, string>,
    accountMap: Map<string, string>
): ParsedSheetData {
    const result: ParsedSheetData = { newTransactions: [], updatedTransactions: [], newLoans: [], updatedLoans: [] };
    
    const transactionMap = new Map(userTransactions.map(t => [t.id, t]));
    const loanMap = new Map(userLoans.map(l => [l.id, l]));

    for (let i = 1; i < sheetData.length; i++) {
        const row = sheetData[i];
        const [id, dateStr, type, accountName, category, contactName, description, amountStr] = row;
        
        if (id && (id.endsWith('_from') || id.endsWith('_to'))) continue;

        const amount = parseFloat(amountStr);
        if (!type || isNaN(amount)) continue;

        const lowerCaseType = type.toLowerCase();
        const isLoan = lowerCaseType.includes('loan');
        
        if (id && (transactionMap.has(id) || loanMap.has(id))) {
            if (isLoan) {
                const existingLoan = loanMap.get(id)!;
                const update: Partial<Loan> & { id: string } = { id };
                let needsUpdate = false;
                if (Math.abs(existingLoan.amount) !== Math.abs(amount)) { update.amount = Math.abs(amount); needsUpdate = true; }
                if (description && existingLoan.description !== description) { update.description = description; needsUpdate = true; }
                if(needsUpdate) result.updatedLoans.push(update);
            } else {
                const existingTx = transactionMap.get(id)!;
                const update: Partial<Transaction> & { id: string } = { id };
                let needsUpdate = false;
                if (Math.abs(existingTx.amount) !== Math.abs(amount)) { update.amount = Math.abs(amount); needsUpdate = true; }
                if (description && existingTx.description !== description) { update.description = description; needsUpdate = true; }
                if (category && existingTx.category !== category) { update.category = category; needsUpdate = true; }
                if(needsUpdate) result.updatedTransactions.push(update);
            }
        } else {
            const date = dateStr ? new Date(dateStr).toISOString() : new Date().toISOString();
            const accountId = accountMap.get(accountName?.toLowerCase());
            
            if (isLoan) {
                result.newLoans.push({
                    type: lowerCaseType.includes('given') ? 'loanGiven' : 'loanTaken',
                    contact_id: contactMap.get(contactName?.toLowerCase()) || contactName,
                    amount: Math.abs(amount),
                    status: 'active',
                    description: description || 'From Google Sheet',
                    date: date,
                    account_id: accountId!,
                });
            } else {
                result.newTransactions.push({
                    date,
                    type: lowerCaseType.includes('income') ? 'income' : 'expense',
                    amount: Math.abs(amount),
                    category: category,
                    description: description || 'From Google Sheet',
                    account_id: accountId,
                    client_id: contactMap.get(contactName?.toLowerCase()),
                });
            }
        }
    }
    return result;
}

async function getGoogleSheetsClient(userId?: string) {
    if (userId) {
        const { data: creds, error } = await supabase.from('user_google_credentials').select('*').eq('user_id', userId).single();
        if (!error && creds) {
            const oauth2Client = getOAuth2Client();
            oauth2Client.setCredentials({ access_token: creds.access_token, refresh_token: creds.refresh_token, scope: creds.scope, token_type: creds.token_type, expiry_date: creds.expiry_date });
            if (creds.expiry_date && new Date(creds.expiry_date) < new Date()) {
                const { credentials } = await oauth2Client.refreshAccessToken();
                 await supabase.from('user_google_credentials').update({ access_token: credentials.access_token, refresh_token: credentials.refresh_token || creds.refresh_token, scope: credentials.scope, token_type: credentials.token_type, expiry_date: credentials.expiry_date }).eq('user_id', userId);
                oauth2Client.setCredentials(credentials);
            }
            return google.sheets({ version: 'v4', auth: oauth2Client });
        }
    }
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;
    if (!email || !privateKey) throw new Error("Google service account credentials are not set in environment variables.");
    const client = new google.auth.JWT(email, undefined, privateKey.replace(/\\n/g, '\n'), ['https://www.googleapis.com/auth/spreadsheets']);
    await client.authorize();
    return google.sheets({ version: 'v4', auth: client });
}

async function getSheetId(sheets: any, spreadsheetId: string, sheetName: string): Promise<number | null> {
    try {
        const response = await sheets.spreadsheets.get({
            spreadsheetId,
            fields: 'sheets(properties(sheetId,title))',
        });
        const sheet = response.data.sheets.find(
            (s: any) => s.properties.title === sheetName
        );
        return sheet ? sheet.properties.sheetId : null;
    } catch (error) {
        console.error(`Could not get sheet ID for ${sheetName}:`, error);
        return null;
    }
}

async function hideSheet(sheets: any, spreadsheetId: string, sheetId: number) {
    try {
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: [
                    {
                        updateSheetProperties: {
                            properties: {
                                sheetId: sheetId,
                                hidden: true,
                            },
                            fields: 'hidden',
                        },
                    },
                ],
            },
        });
    } catch (error) {
        console.warn('Could not hide sheet:', error);
    }
}

async function readFromSheet(sheets: any, sheetId: string, sheetName: string): Promise<any[][] | null> {
    try {
        const response = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: sheetName });
        return response.data.values;
    } catch (error: any) {
        if (error.message.includes('Unable to parse range')) return null;
        throw error;
    }
}

async function writeToSheet(sheets: any, sheetId: string, sheetName: string, values: any[][]) {
     try {
        await sheets.spreadsheets.values.clear({ spreadsheetId: sheetId, range: sheetName });
    } catch (error: any) {
        if (!error.message.includes('Unable to parse range')) console.warn(`[Google Sheets] Could not clear sheet ${sheetName}, may not exist yet.`, error.message);
    }
    await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId, range: `${sheetName}!A1`, valueInputOption: 'USER_ENTERED',
        requestBody: { values: values },
    });
}

export async function syncTransactionsToSheet(input: SyncToGoogleSheetInput): Promise<SyncToGoogleSheetOutput> {
    try {
        const sheets = await getGoogleSheetsClient(input.userId);
        let transactions = input.transactions;
        let loans = input.loans;
        const allContacts: (Client | Contact)[] = [...(input.clients || []), ...(input.contacts || [])];
        const primaryAccount = input.bankAccounts.find(b => b.is_primary) || input.bankAccounts[0];

        if (input.readFromSheet) {
            const dataSheetValues = await readFromSheet(sheets, input.sheetId, DATA_SHEET_NAME);
            const contactMap = new Map<string, string>();
            const accountMap = new Map<string, string>();

            if (dataSheetValues) {
                dataSheetValues.forEach(row => {
                    const [type, id, name] = row;
                    if(type === 'Account') accountMap.set(name.toLowerCase(), id);
                    if(type === 'Client' || type === 'Contact') contactMap.set(name.toLowerCase(), id);
                });
            }
            
            const transactionSheetValues = await readFromSheet(sheets, input.sheetId, TRANSACTIONS_SHEET_NAME);
            if (transactionSheetValues && transactionSheetValues.length > 1) {
                const { newTransactions, newLoans, updatedTransactions, updatedLoans } = parseSheetData(transactionSheetValues, transactions, loans, contactMap, accountMap);
                for (const entry of newTransactions) {
                     const { data, error } = await supabase.from('transactions').insert({...entry, account_id: entry.account_id || primaryAccount?.id, user_id: input.userId!}).select().single();
                     if (!error && data) transactions.push(data);
                }
                 for (const entry of newLoans) {
                     const { data, error } = await supabase.from('loans').insert({...entry, account_id: entry.account_id || primaryAccount?.id, user_id: input.userId!, created_at: entry.date, date: entry.date }).select().single();
                     if (!error && data) loans.push(data);
                 }
                 for (const entry of updatedTransactions) {
                    const { data, error } = await supabase.from('transactions').update(entry).eq('id', entry.id).select().single();
                    if (!error && data) transactions = transactions.map(t => t.id === data.id ? data : t);
                }
                 for (const entry of updatedLoans) {
                    const { data, error } = await supabase.from('loans').update(entry).eq('id', entry.id).select().single();
                     if (!error && data) loans = loans.map(l => l.id === data.id ? data : l);
                }
            }
        }
        
        const { transactionHeaders, transactionRows } = structureDataForSheet(transactions, loans, input.bankAccounts, allContacts);
        await writeToSheet(sheets, input.sheetId, TRANSACTIONS_SHEET_NAME, [transactionHeaders, ...transactionRows]);

        const dataSheetRows = [
            ['Type', 'ID', 'Name'],
            ...input.bankAccounts.map(a => ['Account', a.id, a.name]),
            ...input.clients.map(c => ['Client', c.id, c.name]),
            ...input.contacts.map(c => ['Contact', c.id, c.name]),
        ];
        await writeToSheet(sheets, input.sheetId, DATA_SHEET_NAME, dataSheetRows);

        const dataSheetId = await getSheetId(sheets, input.sheetId, DATA_SHEET_NAME);
        if (dataSheetId) {
            await hideSheet(sheets, input.sheetId, dataSheetId);
        }
       
        return { success: true, message: `Successfully synced ${transactions.length} transactions and ${loans.length} loans.` };

    } catch (e: any) {
        console.error("Error in syncTransactionsToSheet:", e);
        if (e.message.includes('permission') || e.message.includes('PERMISSION_DENIED')) {
             return { success: false, message: 'Permission denied. Please ensure the service account or your connected Google account has Editor access to the Google Sheet.' };
        }
        return { success: false, message: e.message || 'Failed to sync with Google Sheet.' };
    }
}
