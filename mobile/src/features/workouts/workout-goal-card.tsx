import { StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple, useTheme } from 'react-native-paper';

import type { WorkoutGoal } from '@/api/types';
import { IconBadge } from '@/components/icon-badge';
import { ProgressMeter } from '@/components/progress-meter';

import { formatMetricValue } from './format';
import { GOAL_PERIOD_LABELS, METRIC_ICONS, METRIC_LABELS } from './labels';

type WorkoutGoalCardProps = {
  goal: WorkoutGoal;
  /** Absent : carte non cliquable (écran de détail). */
  onPress?: () => void;
};

/** Objectif sportif de la période en cours (valeurs calculées par le backend). */
export function WorkoutGoalCard({ goal, onPress }: WorkoutGoalCardProps) {
  const { colors } = useTheme();
  const current = formatMetricValue(goal.metric, goal.current_value);
  const target = formatMetricValue(goal.metric, goal.target_value);
  const scope = goal.activity_name ?? 'Toutes activités';

  return (
    <TouchableRipple
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'summary'}
      accessibilityLabel={`Objectif ${METRIC_LABELS[goal.metric]}, ${scope} : ${current} sur ${target}`}
      borderless
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
      ]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <IconBadge
            icon={goal.is_reached ? 'trophy-outline' : METRIC_ICONS[goal.metric]}
            tone={goal.is_reached ? 'primary' : 'tertiary'}
            size={40}
          />
          <View style={styles.headerText}>
            <Text variant="titleMedium" numberOfLines={1}>
              {`${METRIC_LABELS[goal.metric]} · ${scope}`}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
              {GOAL_PERIOD_LABELS[goal.period]}
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
                Atteint
              </Text>
            </View>
          ) : null}
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
  bold: { fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 },
  reached: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
