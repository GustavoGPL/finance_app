export const MEMBER_ROLES = ['USER_A', 'USER_B'] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

export const OWNER_TYPES = ['USER_A', 'USER_B', 'SHARED'] as const;
export type OwnerType = (typeof OWNER_TYPES)[number];

export const ACCOUNT_TYPES = ['CHECKING', 'SAVINGS', 'INVESTMENT', 'CREDIT_CARD'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const TRANSACTION_TYPES = ['INCOME', 'EXPENSE', 'TRANSFER'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_STATUSES = ['PAID', 'RECEIVED', 'PENDING'] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export const RECURRENCE_TYPES = ['ONCE', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const;
export type Recurrence = (typeof RECURRENCE_TYPES)[number];

export const VISIBILITIES = ['SELF', 'PARTNER', 'ALL'] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export const CURRENCIES = ['BRL'] as const;
export type Currency = (typeof CURRENCIES)[number];
