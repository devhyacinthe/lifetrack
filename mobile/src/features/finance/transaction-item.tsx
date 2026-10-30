import { StyleSheet, View } from 'react-native';
import { Text, TouchableRipple, useTheme } from 'react-native-paper';

import type { Transaction } from '@/api/types';
import { IconBadge } from '@/components/icon-badge';
import { dayLabel } from '@/utils/dates';

import { formatAmount } from './format';
import { categoryIcon, PAYMENT_METHOD_LABELS } from './labels';

type TransactionItemProps = {
  transaction: Transaction;
  onPress: () => void;
  /** Affiche la date dans la ligne (liste non regroupée par jour). */
  showDate?: boolean;
};

/** Ligne d'une transaction : catégorie, description, compte et montant signé. */
export function TransactionItem({ transaction: tx, onPress, showDate }: TransactionItemProps) {
  const { colors } = useTheme();
  const isIncome = tx.type === 'income';
  const amount = formatAmount(tx.amount, tx.currency, tx.type);
  const details = [
    showDate ? dayLabel(tx.date) : null,
    tx.account_name,
    tx.payment_method ? PAYMENT_METHOD_LABELS[tx.payment_method] : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <TouchableRipple
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${tx.category_name}, ${amount}${tx.description ? `, ${tx.description}` : ''}`}
      accessibilityHint="Ouvre la transaction pour la modifier">
      <View style={styles.row}>
        <IconBadge
          icon={categoryIcon(tx.category_name, tx.type)}
          tone={isIncome ? 'primary' : 'secondary'}
          size={44}
        />
        <View style={styles.text}>
          <Text variant="titleSmall" numberOfLines={1}>
            {tx.description || tx.category_name}
          </Text>
          <Text variant="bodySmall" numberOfLines={1} style={{ color: colors.onSurfaceVariant }}>
            {tx.description ? `${tx.category_name} · ${details}` : details}
          </Text>
        </View>
        <Text
          variant="titleSmall"
          style={[styles.amount, { color: isIncome ? colors.primary : colors.onSurface }]}>
          {amount}
        </Text>
      </View>
    </TouchableRipple>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  text: { flex: 1, gap: 2 },
  amount: { fontWeight: '700' },
});
