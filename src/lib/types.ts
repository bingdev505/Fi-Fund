export type Transaction = {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  category: string;
  amount: number;
  description: string;
  date: Date;
  accountId?: string; // For income/expense
  fromAccountId?: string; // For transfer
  toAccountId?: string; // For transfer
};

export type Debt = {
  id:string;
  type: 'creditor' | 'debtor';
  name: string;
  amount: number;
  description: string;
  dueDate?: Date;
  date: Date;
};

export type BankAccount = {
  id: string;
  name: string;
  balance: number;
};
