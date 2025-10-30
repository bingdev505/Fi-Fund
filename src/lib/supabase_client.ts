
import { createClient } from '@supabase/supabase-js';
import { Transaction } from './types';

// Initialize the Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and anonymous key are required.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Example functions for interacting with the 'transactions' table
export const getTransactions = async (): Promise<Transaction[]> => {
  const { data, error } = await supabase.from('transactions').select('*');
  if (error) throw error;
  return data as Transaction[];
};

export const addTransaction = async (transaction: Omit<Transaction, 'id' | 'userId'>): Promise<Transaction> => {
  const { data, error } = await supabase.from('transactions').insert([transaction]).single();
  if (error) throw error;
  return data as Transaction;
};

export const updateTransaction = async (id: string, updates: Partial<Transaction>): Promise<Transaction> => {
  const { data, error } = await supabase.from('transactions').update(updates).eq('id', id).single();
  if (error) throw error;
  return data as Transaction;
};

export const deleteTransaction = async (id: string): Promise<void> => {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;
};
