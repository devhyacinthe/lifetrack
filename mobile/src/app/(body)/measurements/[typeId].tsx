import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, FAB, Text, TouchableRipple, useTheme } from 'react-native-paper';

import { errorMessage } from '@/api/errors';
import type { Measurement } from '@/api/types';
import { EmptyState } from '@/components/empty-state';
import { QueryStatus } from '@/components/query-status';
import { formatMeasure } from '@/features/body/format';
import { MetricChartCard } from '@/features/body/metric-chart-card';
import { useMeasurements, useMetricType } from '@/features/body/queries';
import { dayLabel } from '@/utils/dates';

function MeasurementRow({
  measurement,
  onPress,
}: {
  measurement: Measurement;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <TouchableRipple
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${dayLabel(measurement.date)} : ${formatMeasure(measurement.value, measurement.unit)}`}
      accessibilityHint="Ouvre la valeur pour la modifier">
      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text variant="bodyLarge">{dayLabel(measurement.date)}</Text>
          {measurement.notes ? (
            <Text variant="bodySmall" numberOfLines={1} style={{ color: colors.onSurfaceVariant }}>
              {measurement.notes}
            </Text>
          ) : null}
        </View>
        <Text variant="titleMedium" style={styles.value}>
          {formatMeasure(measurement.value, measurement.unit)}
        </Text>
      </View>
    </TouchableRipple>
  );
}

export default function MetricTypeScreen() {
  const { typeId } = useLocalSearchParams<{ typeId: string }>();
  const { colors } = useTheme();
  const metricType = useMetricType(typeId);
  const measurements = useMeasurements(typeId);
  const items = useMemo(
    () => measurements.data?.pages.flatMap((page) => page.results) ?? [],
    [measurements.data],
  );

  if (!metricType.isSuccess) {
    return <QueryStatus query={metricType} notFoundTitle="Mesure introuvable" />;
  }

  const renderEmpty = () => {
    if (measurements.isPending) {
      return <ActivityIndicator style={styles.loader} accessibilityLabel="Chargement" />;
    }
    if (measurements.isError) {
      return (
        <EmptyState
          icon="wifi-alert"
          tone="error"
          title="Chargement impossible"
          message={errorMessage(measurements.error)}
          actionLabel="Réessayer"
          onAction={() => measurements.refetch()}
        />
      );
    }
    return (
      <EmptyState
        icon="tape-measure"
        title="Aucune valeur"
        message="Ajoutez une première valeur pour suivre son évolution."
      />
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: metricType.data.name }} />
      <FlatList
        data={items}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <MetricChartCard metricType={metricType.data} />
            <Text variant="titleMedium" accessibilityRole="header">
              Historique
            </Text>
          </View>
        }
        ListEmptyComponent={renderEmpty}
        renderItem={({ item, index }) => (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
              index === 0 && styles.cardFirst,
              index === items.length - 1 && styles.cardLast,
              index > 0 && styles.cardNext,
            ]}>
            <MeasurementRow
              measurement={item}
              onPress={() =>
                router.push({ pathname: '/measurements/entry/[id]', params: { id: item.id } })
              }
            />
          </View>
        )}
        onEndReached={() => {
          if (measurements.hasNextPage && !measurements.isFetchingNextPage) {
            measurements.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          measurements.isFetchingNextPage ? (
            <ActivityIndicator style={styles.footer} accessibilityLabel="Chargement de la suite" />
          ) : undefined
        }
      />
      {metricType.data.is_active ? (
        <FAB
          icon="plus"
          label="Valeur"
          style={styles.fab}
          onPress={() =>
            router.push({ pathname: '/measurements/new', params: { type: metricType.data.id } })
          }
          accessibilityLabel={`Ajouter une valeur : ${metricType.data.name}`}
        />
      ) : null}
    </>
  );
}

const RADIUS = 20;

const styles = StyleSheet.create({
  list: { padding: 20, paddingBottom: 112 },
  header: { gap: 20, marginBottom: 12 },
  loader: { marginTop: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowText: { flex: 1, gap: 2 },
  value: { fontWeight: '700', fontVariant: ['tabular-nums'] },
  card: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  cardFirst: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: RADIUS,
    borderTopRightRadius: RADIUS,
  },
  cardLast: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomLeftRadius: RADIUS,
    borderBottomRightRadius: RADIUS,
  },
  cardNext: { borderTopWidth: StyleSheet.hairlineWidth },
  footer: { marginTop: 16 },
  fab: { position: 'absolute', right: 20, bottom: 28 },
});
