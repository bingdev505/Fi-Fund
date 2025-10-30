
-- Enum Types
CREATE TYPE transaction_type AS ENUM ('income', 'expense', 'transfer', 'repayment');
CREATE TYPE debt_type AS ENUM ('creditor', 'debtor');
CREATE TYPE chat_message_role AS ENUM ('user', 'assistant');
CREATE TYPE entry_type AS ENUM ('income', 'expense', 'creditor', 'debtor');
CREATE TYPE category_type AS ENUM ('income', 'expense');
CREATE TYPE task_status AS ENUM ('todo', 'in-progress', 'done');

-- Tables
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    parent_project_id UUID REFERENCES projects(id),
    google_sheet_id VARCHAR(255)
);

CREATE TABLE bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    name VARCHAR(255) NOT NULL,
    balance NUMERIC NOT NULL,
    is_primary BOOLEAN DEFAULT false
);

CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) NOT NULL,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type category_type NOT NULL
);

CREATE TABLE debts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    project_id UUID REFERENCES projects(id),
    type debt_type NOT NULL,
    client_id UUID REFERENCES clients(id) NOT NULL,
    amount NUMERIC NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    date TIMESTAMPTZ NOT NULL,
    account_id UUID REFERENCES bank_accounts(id)
);

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    project_id UUID REFERENCES projects(id),
    type transaction_type NOT NULL,
    category VARCHAR(255) NOT NULL,
    amount NUMERIC NOT NULL,
    description TEXT,
    date TIMESTAMPTZ NOT NULL,
    account_id UUID REFERENCES bank_accounts(id),
    from_account_id UUID REFERENCES bank_accounts(id),
    to_account_id UUID REFERENCES bank_accounts(id),
    debt_id UUID REFERENCES debts(id),
    client_id UUID REFERENCES clients(id)
);

CREATE TABLE user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    currency VARCHAR(3) NOT NULL
);

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role chat_message_role NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    transaction_id UUID REFERENCES transactions(id),
    entry_type entry_type
);

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    project_id UUID REFERENCES projects(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status task_status NOT NULL DEFAULT 'todo',
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE hobbies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    time_goal_minutes INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    project_id UUID REFERENCES projects(id),
    site_name VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    password TEXT,
    totp_secret TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
