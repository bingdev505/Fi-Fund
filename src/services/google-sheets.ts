'use server';

import { google } from 'googleapis';
import type { SyncToGoogleSheetInput, SyncToGoogleSheetOutput, Transaction, Loan, Contact, Client, BankAccount } from '@/lib/types';
import { supabase } from '@/lib/supabase_client';
import { getOAuth2Client } from './google-auth';

type StructuredRow = (string | number | null)[];

function structureDataForSheet(
    transactions: Transaction[],
    loans: Loan[],
    bankAccounts: BankAccount[],
    allContacts: (Client | Contact)[]
): { headers: string[], rows: StructuredRow[] } {
    const headers = ["transaction_id", "Date", "Type", "Account", "Category", "Contact", "Description", "Amount"];
    
    const accountMap = new Map(bankAccounts.map(acc => [acc.id, acc.name]));
    const contactMap = new Map(allContacts.map(c => [c.id, c.name]));

    const processedRows: StructuredRow[] = [];

    // Process all transactions first, handling transfers specially
    transactions.forEach(tx => {
        if (tx.type === 'transfer') {
            const fromAccountName = accountMap.get(tx.from_account_id || '') || 'Unknown';
            const toAccountName = accountMap.get(tx.to_account_id || '') || 'Unknown';

            // Create two rows for a transfer
            // 1. Expense from source account
            processedRows.push([
                tx.id + '_from',
                new Date(tx.date).toLocaleDateString('en-CA'),
                'Transfer Out',
                fromAccountName,
                'Bank Transfer',
                '',
                tx.description || `Transfer to ${toAccountName}`,
                -Math.abs(tx.amount)
            ]);
            // 2. Income to destination account
            processedRows.push([
                tx.id + '_to',
                new Date(tx.date).toLocaleDateString('en-CA'),
                'Transfer In',
                toAccountName,
                'Bank Transfer',
                '',
                tx.description || `Transfer from ${fromAccountName}`,
                Math.abs(tx.amount)
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
                 if (relatedLoan?.type === 'loanTaken') amount = -Math.abs(amount);
                 else amount = Math.abs(amount);
            } else if (tx.type === 'income') {
                amount = Math.abs(amount);
            } else { // expense
                amount = -Math.abs(amount);
            }

            processedRows.push([
                tx.id,
                new Date(tx.date).toLocaleDateString('en-CA'),
                type,
                accountMap.get(tx.account_id || '') || '',
                tx.category,
                contact,
                description,
                amount
            ]);
        }
    });

    // Process all loans
    loans.forEach(loan => {
        const type = loan.type === 'loanGiven' ? 'Loan Given' : 'Loan Taken';
        let amount = loan.amount;
        if (loan.type === 'loanGiven') amount = -Math.abs(amount);
        else amount = Math.abs(amount);

        processedRows.push([
            loan.id,
            new Date(loan.date || loan.created_at).toLocaleDateString('en-CA'),
            type,
            accountMap.get(loan.account_id) || '',
            'Loan',
            contactMap.get(loan.contact_id) || 'Unknown Contact',
            loan.description || '',
            amount
        ]);
    });

    // Sort all processed rows by date
    const sortedRows = processedRows.sort((a, b) => {
        const dateA = new Date(a[1] as string).getTime();
        const dateB = new Date(b[1] as string).getTime();
        return dateA - dateB;
    });

    return { headers, rows: sortedRows };
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
    allContacts: (Client|Contact)[],
    allBankAccounts: BankAccount[]
): ParsedSheetData {
    const result: ParsedSheetData = {
        newTransactions: [],
        updatedTransactions: [],
        newLoans: [],
        updatedLoans: [],
    };
    
    const transactionMap = new Map(userTransactions.map(t => [t.id, t]));
    const loanMap = new Map(userLoans.map(l => [l.id, l]));

    const contactMap = new Map(allContacts.map(c => [c.name.toLowerCase(), c.id]));
    const accountMap = new Map(allBankAccounts.map(a => [a.name.toLowerCase(), a.id]));

    // Skip header row
    for (let i = 1; i < sheetData.length; i++) {
        const row = sheetData[i];
        const [id, dateStr, type, accountName, category, contactName, description, amountStr] = row;
        
        // Skip transfer in/out rows as they are derived from a single transaction
        if (id && (id.endsWith('_from') || id.endsWith('_to'))) {
            continue;
        }

        const amount = parseFloat(amountStr);
        if (!type || isNaN(amount)) continue;

        const lowerCaseType = type.toLowerCase();
        
        const isLoan = lowerCaseType.includes('loan');
        
        if (id && (transactionMap.has(id) || loanMap.has(id))) {
            // Existing Entry - check for updates
            if (isLoan) {
                const existingLoan = loanMap.get(id)!;
                const update: Partial<Loan> & { id: string } = { id };
                let needsUpdate = false;

                if (Math.abs(existingLoan.amount) !== Math.abs(amount)) {
                    update.amount = Math.abs(amount);
                    needsUpdate = true;
                }
                if (description && existingLoan.description !== description) {
                    update.description = description;
                    needsUpdate = true;
                }
                if(needsUpdate) result.updatedLoans.push(update);

            } else { // Is Transaction
                const existingTx = transactionMap.get(id)!;
                const update: Partial<Transaction> & { id: string } = { id };
                let needsUpdate = false;

                if (Math.abs(existingTx.amount) !== Math.abs(amount)) {
                    update.amount = Math.abs(amount);
                    needsUpdate = true;
                }
                 if (description && existingTx.description !== description) {
                    update.description = description;
                    needsUpdate = true;
                }
                 if (category && existingTx.category !== category) {
                    update.category = category;
                    needsUpdate = true;
                }
                if(needsUpdate) result.updatedTransactions.push(update);
            }

        } else {
            // New Entry
            const date = dateStr ? new Date(dateStr).toISOString() : new Date().toISOString();
            const accountId = accountMap.get(accountName?.toLowerCase()) || allBankAccounts[0]?.id;
            
            if (isLoan) {
                result.newLoans.push({
                    type: lowerCaseType.includes('given') ? 'loanGiven' : 'loanTaken',
                    contact_id: contactMap.get(contactName?.toLowerCase()) || contactName,
                    amount: Math.abs(amount),
                    status: 'active',
                    description: description || 'From Google Sheet',
                    date: date,
                    account_id: accountId,
                });
            } else {
                result.newTransactions.push({
                    date,
                    type: lowerCaseType.includes('income') ? 'income' : 'expense',
                    amount: Math.abs(amount),
                    category: category,
                    description: description || 'From Google Sheet',
                    account_id: accountId,
                    client_id: contactMap.get(contactName?.toLowerCase()) || undefined,
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
            oauth2Client.setCredentials({
                access_token: creds.access_token,
                refresh_token: creds.refresh_token,
                scope: creds.scope,
                token_type: creds.token_type,
                expiry_date: creds.expiry_date,
            });

            if (creds.expiry_date && new Date(creds.expiry_date) < new Date()) {
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
        const allContacts: (Client | Contact)[] = [...(input.clients || []), ...(input.contacts || [])];
        const primaryAccount = input.bankAccounts.find(b => b.is_primary) || input.bankAccounts[0];


        // Two-way sync: Read from sheet first
        if (input.readFromSheet) {
            const sheetData = await readFromSheet(sheets, input.sheetId, sheetName);
            if (sheetData && sheetData.length > 1) { // More than just a header
                const { newTransactions, newLoans, updatedTransactions, updatedLoans } = parseSheetData(
                    sheetData, 
                    transactions, 
                    loans,
                    allContacts,
                    input.bankAccounts
                );

                for (const entry of newTransactions) {
                     const { data, error } = await supabase.from('transactions').insert({...entry, account_id: entry.account_id || primaryAccount.id, user_id: input.userId!}).select().single();
                     if (!error && data) transactions.push(data);
                }
                 for (const entry of newLoans) {
                     const { data, error } = await supabase.from('loans').insert({...entry, account_id: entry.account_id || primaryAccount.id, user_id: input.userId!, created_at: entry.date, date: entry.date }).select().single();
                     if (!error && data) loans.push(data);
                 }
                 for (const entry of updatedTransactions) {
                    const { data, error } = await supabase.from('transactions').update(entry).eq('id', entry.id).select().single();
                    if (!error && data) {
                        transactions = transactions.map(t => t.id === data.id ? data : t);
                    }
                }
                 for (const entry of updatedLoans) {
                    const { data, error } = await supabase.from('loans').update(entry).eq('id', entry.id).select().single();
                     if (!error && data) {
                        loans = loans.map(l => l.id === data.id ? data : l);
                    }
                }
            }
        }
        
        const { headers, rows } = structureDataForSheet(transactions, loans, input.bankAccounts, allContacts);

        const values = [
            headers,
            ...rows
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
