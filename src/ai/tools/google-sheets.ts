'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { google } from 'googleapis';

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


export const updateGoogleSheet = ai.defineTool(
  {
    name: 'updateGoogleSheet',
    description: 'Updates a range of cells in a Google Sheet. This will overwrite existing data in the specified range.',
    inputSchema: z.object({
      sheetId: z.string().describe('The ID of the Google Spreadsheet.'),
      range: z.string().describe("The A1 notation of the range to update. E.g., 'Sheet1!A1:Z'. It must include the sheet name."),
      values: z.array(z.array(z.any())).describe("The data to be written. It's a 2D array of values."),
    }),
    outputSchema: z.object({
        spreadsheetId: z.string(),
        updatedRange: z.string(),
        updatedRows: z.number(),
    }),
  },
  async (input) => {
    const sheets = await getGoogleSheetsClient();
    
    // 1. Clear the existing sheet content to prevent old data from lingering
    try {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: input.sheetId,
        range: input.range.split('!')[0], // Clear the whole sheet, e.g., 'Sheet1'
      });
    } catch (error: any) {
        // Clearing might fail if the sheet is new/empty, which is fine.
        // We only care about errors that are not 'Unable to parse range'.
        if (!error.message.includes('Unable to parse range')) {
            console.error('[Google Sheets Tool] Error clearing sheet:', error.message);
        }
    }
    
    // 2. Write the new data (headers + rows)
    const result = await sheets.spreadsheets.values.update({
        spreadsheetId: input.sheetId,
        range: input.range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: input.values,
        },
    });

    return {
        spreadsheetId: result.data.spreadsheetId!,
        updatedRange: result.data.updatedRange!,
        updatedRows: result.data.updatedRows!,
    };
  }
);
