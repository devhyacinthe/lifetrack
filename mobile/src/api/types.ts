/** Types des réponses réelles de l'API (voir docs/api-contract.md). */

export type TokenPair = {
  access: string;
  refresh: string;
};

export type User = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  preferred_currency: string;
  timezone: string;
  date_joined: string;
};

export type RegisterPayload = {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
};

export type ProfileUpdatePayload = Partial<
  Pick<User, 'first_name' | 'last_name' | 'preferred_currency' | 'timezone'>
>;

export type ChangePasswordPayload = {
  current_password: string;
  new_password: string;
};

/** Réponse paginée de DRF (PageNumberPagination). */
export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type TransactionType = 'income' | 'expense';
export type AccountType = 'cash' | 'bank' | 'mobile_money' | 'savings';
export type PaymentMethod = 'cash' | 'card' | 'mobile_money' | 'bank_transfer' | 'check' | 'other';

/** Montant décimal exact transmis en chaîne par l'API (ex. "12500.00"). */
export type Decimal = string;

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  initial_balance: Decimal;
  balance: Decimal;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  name: string;
  type: TransactionType;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CategoryCreatePayload = Pick<Category, 'name' | 'type'>;
/** Le type d'une catégorie n'est pas modifiable après sa création. */
export type CategoryUpdatePayload = Partial<Pick<Category, 'name' | 'is_active'>>;

export type Transaction = {
  id: string;
  type: TransactionType;
  amount: Decimal;
  currency: string;
  account: string;
  account_name: string;
  category: string;
  category_name: string;
  /** Date locale YYYY-MM-DD. */
  date: string;
  description: string;
  payment_method: PaymentMethod | '';
  created_at: string;
  updated_at: string;
};

export type TransactionPayload = Pick<
  Transaction,
  'type' | 'amount' | 'account' | 'category' | 'date' | 'description' | 'payment_method'
>;

export type TransactionOrdering = '-date' | 'date' | '-amount' | 'amount';

export type TransactionFilters = {
  search?: string;
  type?: TransactionType;
  category?: string;
  account?: string;
  date_after?: string;
  date_before?: string;
  ordering?: TransactionOrdering;
};
