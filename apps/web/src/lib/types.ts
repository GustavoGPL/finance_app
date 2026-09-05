import type {
  AccountType,
  MemberRole,
  OwnerType,
  Recurrence,
  TransactionStatus,
  TransactionType,
  Visibility,
} from '@finance/shared';

export interface MeUser {
  id: string;
  name: string;
  email: string;
  memberRole: MemberRole;
  householdId: string;
  createdAt: string;
}

export type HouseholdMember = MeUser;

export interface Household {
  id: string;
  name: string;
  inviteCode: string;
  users: HouseholdMember[];
}

export interface MeResult {
  user: MeUser;
  household: Household;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: string;
}

export interface AuthResponse extends AuthTokens {
  user: MeUser;
  household: Household;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
  householdName?: string;
  inviteCode?: string;
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export interface Account {
  id: string;
  householdId: string;
  ownerType: OwnerType;
  name: string;
  type: AccountType;
  initialBalanceCents: number;
  currency: string;
  creditLimitCents: number | null;
  closingDay: number | null;
  dueDay: number | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { transactions: number };
  balanceCents: number;
  debtCents: number;
  paidCents: number;
}

export interface CreateAccountInput {
  name: string;
  type: AccountType;
  ownerType: OwnerType;
  initialBalanceCents?: number;
  creditLimitCents?: number;
  closingDay?: number;
  dueDay?: number;
}

export interface InvoiceTransaction {
  id: string;
  description: string;
  amountCents: number;
  date: string;
  status: string;
  installmentIndex: number | null;
  installmentTotal: number | null;
  category: { id: string; name: string; color: string | null; icon: string | null } | null;
  tags: string[];
}

export interface InvoicePayment {
  id: string;
  description: string;
  amountCents: number;
  date: string;
}

export interface Invoice {
  accountId: string;
  label: string;
  period: { start: string; end: string; dueDate: string };
  totalCents: number;
  paidCents: number;
  remainingCents: number;
  creditLimitCents: number;
  availableCreditCents: number;
  transactions: InvoiceTransaction[];
  payments: InvoicePayment[];
}

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  CHECKING: 'Conta corrente',
  SAVINGS: 'Poupança',
  INVESTMENT: 'Investimento',
  CREDIT_CARD: 'Cartão de crédito',
};

export const OWNER_TYPE_LABEL: Record<OwnerType, string> = {
  USER_A: 'Meu',
  USER_B: 'Do cônjuge',
  SHARED: 'Compartilhado',
};

export const VISIBILITY_LABEL: Record<Visibility, string> = {
  ALL: 'Visão Geral',
  SELF: 'Minhas Finanças',
  PARTNER: 'Finanças do Cônjuge',
};

// ---------------------------------------------------------------------------
// Categories, Tags & Transactions
// ---------------------------------------------------------------------------

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  parentId: string | null;
  isDefault: boolean;
  icon: string | null;
  color: string | null;
  createdAt: string;
}

export interface Tag {
  id: string;
  name: string;
}

export interface Transaction {
  id: string;
  description: string;
  amountCents: number;
  type: TransactionType;
  status: TransactionStatus;
  ownerType: OwnerType;
  date: string;
  recurrence: Recurrence;
  categoryId: string | null;
  accountId: string | null;
  creditCardId: string | null;
  transferToAccountId: string | null;
  installmentIndex: number | null;
  installmentTotal: number | null;
  installmentGroupId: string | null;
  notes: string | null;
  createdAt: string;
  category: { id: string; name: string; color: string | null; icon: string | null } | null;
  account: { id: string; name: string; type: AccountType } | null;
  creditCard: { id: string; name: string; type: AccountType } | null;
  transferToAccount: { id: string; name: string; type: AccountType } | null;
  paidBy: { id: string; name: string; memberRole: MemberRole } | null;
  tags: string[];
}

export interface CreateTransactionInput {
  description: string;
  amountCents: number;
  type: TransactionType;
  date: string;
  ownerType: OwnerType;
  categoryId?: string;
  accountId?: string;
  creditCardId?: string;
  transferToAccountId?: string;
  paidById?: string;
  status?: TransactionStatus;
  recurrence?: Recurrence;
  tags?: string[];
  notes?: string;
  installments?: number;
}

export const TRANSACTION_TYPE_LABEL: Record<TransactionType, string> = {
  INCOME: 'Receita',
  EXPENSE: 'Despesa',
  TRANSFER: 'Transferência',
};

export const TRANSACTION_STATUS_LABEL: Record<TransactionStatus, string> = {
  PAID: 'Pago',
  RECEIVED: 'Recebido',
  PENDING: 'Pendente',
};

export const RECURRENCE_LABEL: Record<Recurrence, string> = {
  ONCE: 'Única',
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensal',
  YEARLY: 'Anual',
};

// ---------------------------------------------------------------------------
// Budgets & Goals
// ---------------------------------------------------------------------------

export interface Budget {
  id: string;
  categoryId: string;
  month: number;
  year: number;
  limitCents: number;
  createdAt: string;
  updatedAt: string;
  spentCents: number;
  category: { id: string; name: string; color: string | null; icon: string | null; type: string };
}

export interface GoalContribution {
  id: string;
  amountCents: number;
  date: string;
  notes: string | null;
  createdAt: string;
  user: { id: string; name: string };
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetCents: number;
  currentCents: number;
  deadline: string | null;
  color: string | null;
  createdAt: string;
  updatedAt: string;
  progressPercent: number;
  contributions: GoalContribution[];
}

export interface CreateGoalInput {
  name: string;
  targetCents: number;
  deadline?: string;
  color?: string;
}
