export type Transaction = {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  date: Date;
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
