import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Surface, Text, useTheme } from 'react-native-paper';

import { IconBadge } from './icon-badge';

type SectionCardProps = {
  icon: string;
  title: string;
  description?: string;
  tone?: 'primary' | 'secondary' | 'tertiary' | 'error';
  children?: ReactNode;
};

/** Carte de section : pastille d'icône, titre, description, puis contenu. */
export function SectionCard({ icon, title, description, tone, children }: SectionCardProps) {
  const { colors } = useTheme();

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
          {description ? (
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
              {description}
            </Text>
          ) : null}
        </View>
      </View>
      {children ? <View style={styles.body}>{children}</View> : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, padding: 18, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerText: { flex: 1, gap: 2 },
  body: { gap: 12 },
});
