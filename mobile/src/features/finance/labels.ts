/** Libellés français et icônes des valeurs financières (présentation uniquement). */
import type {
  AccountType,
  BudgetPeriod,
  PaymentMethod,
  TransactionOrdering,
  TransactionType,
} from '@/api/types';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Espèces',
  card: 'Carte',
  mobile_money: 'Mobile Money',
  bank_transfer: 'Virement',
  check: 'Chèque',
  other: 'Autre',
};

export const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];

export const ORDERING_LABELS: Record<TransactionOrdering, string> = {
  '-date': 'Plus récentes',
  date: 'Plus anciennes',
  '-amount': 'Montant décroissant',
  amount: 'Montant croissant',
};

/** Icônes des catégories créées par défaut ; les autres reçoivent l'icône de leur type. */
const CATEGORY_ICONS: Record<string, string> = {
  Alimentation: 'food-apple-outline',
  Transport: 'bus',
  Logement: 'home-outline',
  'Factures (eau, électricité)': 'lightning-bolt-outline',
  'Communication (crédit, internet)': 'cellphone-wireless',
  Santé: 'medical-bag',
  Éducation: 'school-outline',
  Loisirs: 'gamepad-variant-outline',
  Vêtements: 'tshirt-crew-outline',
  'Famille et dons': 'hand-heart-outline',
  Salaire: 'briefcase-outline',
  'Activité indépendante': 'laptop',
  Commerce: 'storefront-outline',
  'Cadeaux reçus': 'gift-outline',
  Remboursements: 'cash-refund',
};

export function categoryIcon(name: string, type: TransactionType): string {
  return CATEGORY_ICONS[name] ?? (type === 'income' ? 'arrow-bottom-left' : 'arrow-top-right');
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  cash: 'Espèces',
  bank: 'Banque',
  mobile_money: 'Mobile Money',
  savings: 'Épargne',
};

export const ACCOUNT_TYPE_ICONS: Record<AccountType, string> = {
  cash: 'cash',
  bank: 'bank-outline',
  mobile_money: 'cellphone',
  savings: 'piggy-bank-outline',
};

export const ACCOUNT_TYPES = Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[];

export const BUDGET_PERIOD_LABELS: Record<BudgetPeriod, string> = {
  weekly: 'Par semaine',
  monthly: 'Par mois',
  yearly: 'Par an',
};

export const BUDGET_PERIODS = Object.keys(BUDGET_PERIOD_LABELS) as BudgetPeriod[];
