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

export type AccountPayload = Pick<Account, 'name' | 'type' | 'currency' | 'initial_balance'>;
export type AccountUpdatePayload = Partial<AccountPayload & Pick<Account, 'is_archived'>>;

export type Transfer = {
  id: string;
  from_account: string;
  from_account_name: string;
  to_account: string;
  to_account_name: string;
  amount: Decimal;
  currency: string;
  /** Date locale YYYY-MM-DD. */
  date: string;
  description: string;
  created_at: string;
  updated_at: string;
};

export type TransferPayload = Pick<
  Transfer,
  'from_account' | 'to_account' | 'amount' | 'date' | 'description'
>;

export type BudgetPeriod = 'weekly' | 'monthly' | 'yearly';

export type Budget = {
  id: string;
  /** null : budget global (toutes les dépenses). */
  category: string | null;
  category_name: string | null;
  amount: Decimal;
  currency: string;
  period: BudgetPeriod;
  /** Consommation de la période en cours, calculée par le backend. */
  period_start: string;
  period_end: string;
  spent: Decimal;
  /** Négatif en cas de dépassement. */
  remaining: Decimal;
  /** Pourcentage arrondi à 0,1 ; peut dépasser 100. */
  percent_used: Decimal;
  created_at: string;
  updated_at: string;
};

export type BudgetPayload = Pick<Budget, 'category' | 'amount' | 'currency' | 'period'>;

export type SavingsGoal = {
  id: string;
  name: string;
  account: string;
  account_name: string;
  currency: string;
  target_amount: Decimal;
  deadline: string | null;
  /** Solde du compte rattaché, calculé par le backend. */
  current_amount: Decimal;
  remaining_amount: Decimal;
  /** Entre 0 et 100. */
  percent: Decimal;
  is_reached: boolean;
  created_at: string;
  updated_at: string;
};

export type SavingsGoalPayload = Pick<
  SavingsGoal,
  'name' | 'account' | 'target_amount' | 'deadline'
>;

// --- Sport --------------------------------------------------------------------------------

export type ActivityType = {
  id: string;
  name: string;
  /** La distance a un sens pour cette activité (course, vélo…). */
  tracks_distance: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ActivityTypePayload = Pick<ActivityType, 'name' | 'tracks_distance'>;
export type ActivityTypeUpdatePayload = Partial<
  ActivityTypePayload & Pick<ActivityType, 'is_active'>
>;

/** En cours : démarrée, sans durée ni intensité. Terminée : valeurs de fin renseignées. */
export type WorkoutStatus = 'in_progress' | 'completed';

export type Workout = {
  id: string;
  activity: string;
  activity_name: string;
  status: WorkoutStatus;
  /** Instant ISO 8601 (UTC). */
  started_at: string;
  /** null tant que la séance est en cours. */
  duration_seconds: number | null;
  /** De 1 à 10 ; null tant que la séance est en cours. */
  intensity: number | null;
  distance_km: Decimal | null;
  /** Estimation saisie par l'utilisateur, jamais une mesure exacte. */
  estimated_calories: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
};

/** Séance passée, saisie directement terminée. */
export type WorkoutPayload = Pick<
  Workout,
  | 'activity'
  | 'status'
  | 'started_at'
  | 'duration_seconds'
  | 'intensity'
  | 'distance_km'
  | 'estimated_calories'
  | 'notes'
>;

/** Démarrage d'une séance : seuls l'activité, le début et des notes sont connus. */
export type StartWorkoutPayload = Pick<Workout, 'activity' | 'started_at' | 'notes'> & {
  status: 'in_progress';
};

/** Fin d'une séance en cours (durée calculée par le backend si absente). */
export type FinishWorkoutPayload = Pick<
  Workout,
  'duration_seconds' | 'distance_km' | 'estimated_calories' | 'notes'
> & { intensity: number };

export type WorkoutFilters = {
  activity?: string;
  status?: WorkoutStatus;
};

export type WorkoutGoalMetric = 'sessions' | 'duration' | 'distance';
export type WorkoutGoalPeriod = 'weekly' | 'monthly';

export type WorkoutGoal = {
  id: string;
  metric: WorkoutGoalMetric;
  period: WorkoutGoalPeriod;
  /** null : toutes les activités. */
  activity: string | null;
  activity_name: string | null;
  /** Séances : nombre ; durée : secondes ; distance : km. */
  target_value: Decimal;
  /** Progression de la période en cours, calculée par le backend. */
  period_start: string;
  period_end: string;
  current_value: Decimal;
  /** Entre 0 et 100. */
  percent: Decimal;
  is_reached: boolean;
  created_at: string;
  updated_at: string;
};

export type WorkoutGoalPayload = Pick<
  WorkoutGoal,
  'metric' | 'period' | 'activity' | 'target_value'
>;

export type ActivityStats = {
  activity: string;
  activity_name: string;
  sessions_count: number;
  total_duration_seconds: number;
  total_distance_km: Decimal;
};

export type WorkoutStats = {
  period: WorkoutGoalPeriod;
  period_start: string;
  period_end: string;
  sessions_count: number;
  total_duration_seconds: number;
  average_duration_seconds: number;
  total_distance_km: Decimal;
  by_activity: ActivityStats[];
};

export type PeriodTotals = {
  period_start: string;
  period_end: string;
  sessions_count: number;
  total_duration_seconds: number;
  total_distance_km: Decimal;
};

/** Historique : de la plus ancienne période à la période en cours. */
export type WorkoutHistory = {
  period: WorkoutGoalPeriod;
  periods: PeriodTotals[];
};

// --- Statistiques financières --------------------------------------------------------------

export type MonthTotals = {
  period_start: string;
  period_end: string;
  income: Decimal;
  expense: Decimal;
  /** Revenus moins dépenses du mois. */
  net: Decimal;
};

export type MonthlyStats = {
  currency: string;
  months: MonthTotals[];
};

export type CategoryTotal = {
  category: string;
  category_name: string;
  total: Decimal;
  transactions_count: number;
  /** Part du total, arrondie à 0,1 %. */
  percent: Decimal;
};

export type CategoryStats = {
  type: TransactionType;
  currency: string;
  period: BudgetPeriod;
  period_start: string;
  period_end: string;
  total: Decimal;
  categories: CategoryTotal[];
};

// --- Mesures corporelles -------------------------------------------------------------------

export type MetricType = {
  id: string;
  name: string;
  unit: string;
  is_active: boolean;
  /** Calculés par le backend à partir des mesures enregistrées. */
  latest_value: Decimal | null;
  latest_date: string | null;
  measurements_count: number;
  created_at: string;
  updated_at: string;
};

export type MetricTypePayload = Pick<MetricType, 'name' | 'unit'>;
export type MetricTypeUpdatePayload = Partial<Pick<MetricType, 'name' | 'unit' | 'is_active'>>;

export type Measurement = {
  id: string;
  metric_type: string;
  metric_type_name: string;
  unit: string;
  /** Date locale YYYY-MM-DD ; une seule mesure par type et par jour. */
  date: string;
  value: Decimal;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type MeasurementPayload = Pick<Measurement, 'metric_type' | 'date' | 'value' | 'notes'>;

export type SeriesPoint = { date: string; value: Decimal };

export type MetricSeries = {
  metric_type: string;
  name: string;
  unit: string;
  start_date: string;
  end_date: string;
  /** Valeurs réellement saisies, de la plus ancienne à la plus récente (aucune interpolation). */
  points: SeriesPoint[];
  minimum: Decimal | null;
  maximum: Decimal | null;
  first: Decimal | null;
  last: Decimal | null;
  change: Decimal | null;
};

// --- Tableau de bord -----------------------------------------------------------------------

export type CurrencyBalance = {
  currency: string;
  balance: Decimal;
  accounts_count: number;
};

export type DashboardFinance = {
  income: Decimal;
  expense: Decimal;
  /** Revenus moins dépenses du mois. */
  net: Decimal;
  /** Somme des soldes des comptes non archivés dans la devise préférée. */
  balance: Decimal;
  accounts_count: number;
  /** Comptes actifs des autres devises, jamais additionnés au solde principal. */
  other_currencies: CurrencyBalance[];
};

/** Indicateurs du mois en cours, dans la devise préférée (GET /dashboard/). */
export type Dashboard = {
  reference_date: string;
  period_start: string;
  period_end: string;
  currency: string;
  finance: DashboardFinance;
  budgets: Budget[];
  workouts: WorkoutStats;
  ongoing_session: Workout | null;
  workout_goals: WorkoutGoal[];
  latest_transactions: Transaction[];
  latest_sessions: Workout[];
};
