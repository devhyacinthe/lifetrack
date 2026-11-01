import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple, useTheme } from 'react-native-paper';

import type { Dashboard } from '@/api/types';
import { formatAmount } from '@/features/finance/format';
import { formatPeriodRange } from '@/utils/dates';

/**
 * Solde estimé (comptes actifs de la devise préférée) et bilan du mois. Les comptes d'une
 * autre devise sont affichés à part : leurs montants ne s'additionnent pas.
 */
export function BalanceHero({ dashboard }: { dashboard: Dashboard }) {
  const { colors, dark } = useTheme();
  const { finance, currency } = dashboard;
  const background = dark ? colors.primaryContainer : colors.primary;
  const onHero = dark ? colors.onPrimaryContainer : colors.onPrimary;
  const accounts = `${finance.accounts_count} compte${finance.accounts_count > 1 ? 's' : ''} actif${
    finance.accounts_count > 1 ? 's' : ''
  }`;

  return (
    <TouchableRipple
      onPress={() => router.push('/accounts')}
      borderless
      style={[styles.card, { backgroundColor: background }]}
      accessibilityRole="button"
      accessibilityLabel={`Solde estimé : ${formatAmount(finance.balance, currency)}, ${accounts}. Ouvre les comptes`}>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text variant="labelLarge" style={[styles.dim, styles.flex, { color: onHero }]}>
            Solde estimé · {accounts}
          </Text>
          <Icon source="chevron-right" size={20} color={onHero} />
        </View>
        <Text
          variant="displaySmall"
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[styles.balance, { color: onHero }]}>
          {formatAmount(finance.balance, currency)}
        </Text>
        {finance.other_currencies.length > 0 ? (
          <Text variant="bodySmall" style={[styles.dim, { color: onHero }]}>
            {`Autres devises : ${finance.other_currencies
              .map((c) => formatAmount(c.balance, c.currency))
              .join(' · ')}`}
          </Text>
        ) : null}

        <View style={[styles.month, { borderTopColor: onHero }]}>
          <Text variant="labelMedium" style={[styles.dim, { color: onHero }]}>
            {formatPeriodRange(dashboard.period_start, dashboard.period_end)}
          </Text>
          <View style={styles.figures}>
            <Figure label="Revenus" value={formatAmount(finance.income, currency)} color={onHero} />
            <Figure
              label="Dépenses"
              value={formatAmount(finance.expense, currency)}
              color={onHero}
            />
            <Figure
              label="Solde du mois"
              value={formatAmount(finance.net, currency)}
              color={onHero}
            />
          </View>
        </View>
      </View>
    </TouchableRipple>
  );
}

function Figure({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.figure}>
      <Text variant="titleSmall" numberOfLines={1} adjustsFontSizeToFit style={{ color }}>
        {value}
      </Text>
      <Text variant="labelSmall" style={[styles.dim, { color }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 28 },
  content: { padding: 20, gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  dim: { opacity: 0.85 },
  balance: { fontWeight: '700', fontVariant: ['tabular-nums'] },
  month: {
    marginTop: 12,
    paddingTop: 14,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  figures: { flexDirection: 'row', gap: 12 },
  figure: { flex: 1, gap: 2 },
});
