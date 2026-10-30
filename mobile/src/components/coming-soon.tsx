import { StyleSheet, View } from 'react-native';
import { Surface, Text, useTheme } from 'react-native-paper';

import { IconBadge } from './icon-badge';

type ComingSoonProps = {
  icon: string;
  title: string;
  description: string;
  /** Phase du plan de développement dans laquelle la fonctionnalité sera livrée. */
  phase: number;
  tone?: 'primary' | 'secondary' | 'tertiary';
};

/**
 * Emplacement d'une fonctionnalité pas encore développée.
 * Affiche explicitement « Bientôt disponible » : aucune donnée fictive n'est présentée.
 */
export function ComingSoon({ icon, title, description, phase, tone = 'primary' }: ComingSoonProps) {
  const { colors } = useTheme();

  return (
    <Surface
      elevation={0}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}
      accessible
      accessibilityLabel={`${title} : bientôt disponible, phase ${phase}`}>
      <View style={styles.row}>
        <IconBadge icon={icon} tone={tone} size={52} />
        <View style={[styles.pill, { backgroundColor: colors.surfaceVariant }]}>
          <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
            {`BIENTÔT · PHASE ${phase}`}
          </Text>
        </View>
      </View>
      <Text variant="titleLarge">{title}</Text>
      <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
        {description}
      </Text>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, padding: 20, gap: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
});
