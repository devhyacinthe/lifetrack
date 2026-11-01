import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button, Icon, Text, TouchableRipple, useTheme } from 'react-native-paper';

import type { SavingsGoal } from '@/api/types';
import { IconBadge } from '@/components/icon-badge';
import { ProgressMeter } from '@/components/progress-meter';
import { fromIsoDate } from '@/utils/dates';

import { formatAmount } from './format';

type GoalCardProps = {
  goal: SavingsGoal;
  /** Absent : carte non cliquable (écran de détail). */
  onPress?: () => void;
};

/** Objectif d'épargne : progression = solde du compte rattaché (valeurs du backend). */
export function GoalCard({ goal, onPress }: GoalCardProps) {
  const { colors } = useTheme();
  const current = formatAmount(goal.current_amount, goal.currency);
  const target = formatAmount(goal.target_amount, goal.currency);
  const remaining = formatAmount(goal.remaining_amount, goal.currency);
  const deadline = goal.deadline
    ? fromIsoDate(goal.deadline).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <TouchableRipple
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'summary'}
      accessibilityLabel={`Objectif ${goal.name} : ${current} sur ${target}`}
      borderless
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
      ]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <IconBadge
            icon={goal.is_reached ? 'trophy-outline' : 'flag-checkered'}
            tone="tertiary"
            size={44}
          />
          <View style={styles.headerText}>
            <Text variant="titleMedium" numberOfLines={1}>
              {goal.name}
            </Text>
            <Text variant="bodySmall" numberOfLines={1} style={{ color: colors.onSurfaceVariant }}>
              {deadline ? `${goal.account_name} · avant le ${deadline}` : goal.account_name}
            </Text>
          </View>
          <Text variant="titleMedium" style={styles.bold}>
            {`${goal.percent.replace('.', ',')} %`}
          </Text>
        </View>

        <ProgressMeter
          kind="goal"
          percent={Number(goal.percent)}
          accessibilityLabel={`${goal.percent} % de l’objectif atteint`}
        />

        <View style={styles.footer}>
          <Text variant="bodyMedium">
            <Text style={styles.bold}>{current}</Text>
            <Text style={{ color: colors.onSurfaceVariant }}>{` sur ${target}`}</Text>
          </Text>
          {goal.is_reached ? (
            <View style={styles.reached}>
              <Icon source="check-circle" size={18} color={colors.primary} />
              <Text variant="bodyMedium" style={[styles.bold, { color: colors.primary }]}>
                Objectif atteint
              </Text>
            </View>
          ) : (
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
              {`Reste ${remaining}`}
            </Text>
          )}
        </View>

        {!goal.is_reached ? (
          <Button
            mode="contained-tonal"
            icon="piggy-bank-outline"
            onPress={() =>
              router.push({ pathname: '/transfers/new', params: { to: goal.account } })
            }>
            Épargner
          </Button>
        ) : null}
      </View>
    </TouchableRipple>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  content: { padding: 18, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1, gap: 2 },
  bold: { fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 },
  reached: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
