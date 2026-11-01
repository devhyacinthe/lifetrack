import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { errorMessage } from '@/api/errors';
import { SectionCard } from '@/components/section-card';
import { metricIcon } from '@/features/body/format';
import { MetricChartCard } from '@/features/body/metric-chart-card';
import { bodyKeys, useMetricTypes } from '@/features/body/queries';
import { financeKeys } from '@/features/finance/queries';
import { CategoryCard } from '@/features/stats/category-card';
import { FinanceTrendCard } from '@/features/stats/finance-trend-card';
import { WorkoutHistoryCard } from '@/features/stats/workout-history-card';
import { workoutKeys } from '@/features/workouts/queries';

/** Mesures corporelles : courbe d'un type choisi parmi ceux qui ont des valeurs. */
function BodySection() {
  const { colors } = useTheme();
  const types = useMetricTypes();
  const [selected, setSelected] = useState<string | undefined>();
  const measured = (types.data ?? []).filter((t) => t.is_active && t.measurements_count > 0);
  const current = measured.find((t) => t.id === selected) ?? measured[0];

  const openMeasurements = () => router.push('/measurements');

  if (types.isError) {
    return (
      <SectionCard
        icon="wifi-alert"
        tone="error"
        title="Mesures corporelles"
        description={errorMessage(types.error)}>
        <Button mode="contained-tonal" onPress={() => types.refetch()}>
          Réessayer
        </Button>
      </SectionCard>
    );
  }
  if (types.isSuccess && !current) {
    return (
      <SectionCard
        icon="tape-measure"
        title="Mesures corporelles"
        description="Facultatives : poids, tour de taille… Aucune valeur enregistrée pour l’instant.">
        <Button mode="contained-tonal" icon="plus" onPress={openMeasurements}>
          Ajouter une mesure
        </Button>
      </SectionCard>
    );
  }
  if (!current) return null;

  return (
    <View style={styles.block}>
      <MetricChartCard
        metricType={current}
        controls={
          measured.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}>
              {measured.map((t) => (
                <Chip
                  key={t.id}
                  icon={metricIcon(t.name, t.unit)}
                  selected={t.id === current.id}
                  showSelectedOverlay
                  onPress={() => setSelected(t.id)}
                  style={
                    t.id === current.id ? { backgroundColor: colors.primaryContainer } : undefined
                  }>
                  {t.name}
                </Chip>
              ))}
            </ScrollView>
          ) : undefined
        }
      />
      <Button mode="contained-tonal" icon="tape-measure" onPress={openMeasurements}>
        Toutes les mesures corporelles
      </Button>
    </View>
  );
}

export default function StatsScreen() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all(
        [financeKeys.all, workoutKeys.all, bodyKeys.all].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }>
        <View style={styles.header}>
          <Text variant="headlineLarge" accessibilityRole="header">
            Statistiques
          </Text>
          <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
            Calculées à partir de vos données enregistrées.
          </Text>
        </View>

        <Text variant="titleMedium" accessibilityRole="header" style={styles.section}>
          Finances
        </Text>
        <FinanceTrendCard />
        <CategoryCard />

        <Text variant="titleMedium" accessibilityRole="header" style={styles.section}>
          Sport
        </Text>
        <WorkoutHistoryCard />

        <Text variant="titleMedium" accessibilityRole="header" style={styles.section}>
          Mesures corporelles
        </Text>
        <BodySection />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, gap: 16 },
  header: { gap: 4, marginBottom: 4 },
  section: { marginTop: 8 },
  block: { gap: 12 },
  chips: { gap: 8, paddingRight: 8 },
});
