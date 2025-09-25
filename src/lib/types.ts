export type Transaction = {
  id: string;
  userId: string;
  type: 'income' | 'expense' | 'transfer';
  category: string;
  amount: number;
  description: string;
  date: string; // Stored as ISO string
  accountId?: string; // For income/expense
  fromAccountId?: string; // For transfer
  toAccountId?: string; // For transfer
};

export type Debt = {
  id:string;
  userId: string;
  type: 'creditor' | 'debtor';
  name: string;
  amount: number;
  description: string;
  dueDate?: string; // Stored as ISO string
  date: string; // Stored as ISO string
};

export type BankAccount = {
  id: string;
  userId: string;
  name: string;
  balance: number;
};
