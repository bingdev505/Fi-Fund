
import { createClient } from '@supabase/supabase-js';
import type { Transaction, Debt, BankAccount, Project, Client, Category, Task, Hobby, Credential } from './types';

// Initialize the Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and anonymous key are required.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Generic function to fetch data
export const getTableData = async <T>(tableName: string, userId: string): Promise<T[]> => {
    const { data, error } = await supabase.from(tableName).select('*').eq('userId', userId);
    if (error) throw error;
    return data as T[];
};

// Generic function to add data
export const addTableData = async <T extends { id: string }>(tableName: string, record: Omit<T, 'id'>): Promise<T> => {
    const { data, error } = await supabase.from(tableName).insert([record]).select().single();
    if (error) throw error;
    return data as T;
};

// Generic function to update data
export const updateTableData = async <T>(tableName: string, id: string, updates: Partial<T>): Promise<T> => {
    const { data, error } = await supabase.from(tableName).update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as T;
};

// Generic function to delete data
export const deleteTableData = async (tableName: string, id: string): Promise<void> => {
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) throw error;
};
