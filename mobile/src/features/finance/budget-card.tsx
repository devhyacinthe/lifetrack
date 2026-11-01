import { StyleSheet, View } from 'react-native';
import { Text, TouchableRipple, useTheme } from 'react-native-paper';

import type { Budget } from '@/api/types';
import { IconBadge } from '@/components/icon-badge';
import { ProgressMeter } from '@/components/progress-meter';

import { formatAmount, formatPeriodRange } from './format';
import { BUDGET_PERIOD_LABELS, categoryIcon } from './labels';

type BudgetCardProps = {
  budget: Budget;
  /** Absent : carte non cliquable (écran de détail). */
  onPress?: () => void;
};

/** Budget de la période en cours : dépensé, plafond, jauge et reste (valeurs du backend). */
export function BudgetCard({ budget, onPress }: BudgetCardProps) {
  const { colors } = useTheme();
  const name = budget.category_name ?? 'Toutes les dépenses';
  const percent = Number(budget.percent_used); // affichage uniquement
  const overspent = budget.remaining.startsWith('-');
  const remaining = formatAmount(budget.remaining.replace('-', ''), budget.currency);
  const spent = formatAmount(budget.spent, budget.currency);
  const limit = formatAmount(budget.amount, budget.currency);

  return (
    <TouchableRipple
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'summary'}
      accessibilityLabel={`Budget ${name} : ${spent} dépensés sur ${limit}`}
      borderless
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
      ]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <IconBadge
            icon={
              budget.category_name ? categoryIcon(budget.category_name, 'expense') : 'all-inclusive'
            }
            tone={overspent ? 'error' : 'secondary'}
            size={40}
          />
          <View style={styles.headerText}>
            <Text variant="titleMedium" numberOfLines={1}>
              {name}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
              {`${BUDGET_PERIOD_LABELS[budget.period]} · ${formatPeriodRange(budget.period_start, budget.period_end)}`}
            </Text>
          </View>
          <Text
            variant="titleMedium"
            style={[styles.percent, { color: overspent ? colors.error : colors.onSurface }]}>
            {`${budget.percent_used.replace('.', ',')} %`}
          </Text>
        </View>
        <ProgressMeter
          kind="budget"
          percent={percent}
          accessibilityLabel={`${budget.percent_used} % du budget consommé`}
        />
        <View style={styles.footer}>
          <Text variant="bodyMedium">
            <Text style={styles.bold}>{spent}</Text>
            <Text style={{ color: colors.onSurfaceVariant }}>{` sur ${limit}`}</Text>
          </Text>
          <Text
            variant="bodyMedium"
            style={[styles.bold, { color: overspent ? colors.error : colors.primary }]}>
            {overspent ? `Dépassé de ${remaining}` : `Reste ${remaining}`}
          </Text>
        </View>
      </View>
    </TouchableRipple>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  content: { padding: 18, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1, gap: 2 },
  percent: { fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 },
  bold: { fontWeight: '700' },
});
