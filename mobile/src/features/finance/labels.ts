/** Libellés français et icônes des valeurs financières (présentation uniquement). */
import type { PaymentMethod, TransactionOrdering, TransactionType } from '@/api/types';

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  income: 'Revenu',
  expense: 'Dépense',
};

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
