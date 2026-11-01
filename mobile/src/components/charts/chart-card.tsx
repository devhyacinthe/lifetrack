import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Surface, Text, useTheme } from 'react-native-paper';

import { errorMessage } from '@/api/errors';

import { IconBadge } from '../icon-badge';

type QueryLike = { isPending: boolean; isError: boolean; error: unknown; refetch: () => unknown };

type ChartCardProps = {
  icon: string;
  title: string;
  subtitle?: string;
  tone?: 'primary' | 'secondary' | 'tertiary';
  /** Sélecteurs (période, type…) affichés sous le titre. */
  controls?: ReactNode;
  /** Requête dont dépend le graphique : chargement et erreur sont gérés ici. */
  query: QueryLike;
  /** Message affiché quand la requête réussit mais qu'il n'y a rien à dessiner. */
  emptyMessage?: string | null;
  children?: ReactNode;
};

/**
 * Carte d'un graphique : en-tête, sélecteurs, puis le graphique ou son état
 * (chargement, erreur réseau avec « Réessayer », absence de données).
 */
export function ChartCard({
  icon,
  title,
  subtitle,
  tone = 'primary',
  controls,
  query,
  emptyMessage,
  children,
}: ChartCardProps) {
  const { colors } = useTheme();

  let body: ReactNode;
  if (query.isPending) {
    body = <ActivityIndicator style={styles.state} accessibilityLabel={`Chargement : ${title}`} />;
  } else if (query.isError) {
    body = (
      <View style={styles.state}>
        <Text variant="bodyMedium" style={[styles.center, { color: colors.error }]}>
          {errorMessage(query.error)}
        </Text>
        <Button mode="contained-tonal" onPress={() => query.refetch()}>
          Réessayer
        </Button>
      </View>
    );
  } else if (emptyMessage) {
    body = (
      <Text
        variant="bodyMedium"
        style={[styles.state, styles.center, { color: colors.onSurfaceVariant }]}>
        {emptyMessage}
      </Text>
    );
  } else {
    body = children;
  }

  return (
    <Surface
      elevation={0}
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
      ]}>
      <View style={styles.header}>
        <IconBadge icon={icon} tone={tone} size={40} />
        <View style={styles.headerText}>
          <Text variant="titleMedium" accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {controls}
      {body}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, padding: 18, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerText: { flex: 1, gap: 2 },
  state: { minHeight: 120, justifyContent: 'center', alignItems: 'center', gap: 12 },
  center: { textAlign: 'center' },
});
