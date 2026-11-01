import { Children, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Surface, Text, useTheme } from 'react-native-paper';

type ListCardProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
};

/** Carte arrondie contenant des lignes séparées par un trait fin, avec un titre facultatif. */
export function ListCard({ title, subtitle, children }: ListCardProps) {
  const { colors } = useTheme();
  const rows = Children.toArray(children);

  return (
    <View style={styles.root}>
      {title ? (
        <Text
          variant="titleSmall"
          style={[styles.title, { color: colors.onSurfaceVariant }]}
          accessibilityRole="header">
          {title}
        </Text>
      ) : null}
      {subtitle ? (
        <Text variant="bodySmall" style={[styles.title, { color: colors.onSurfaceVariant }]}>
          {subtitle}
        </Text>
      ) : null}
      <Surface
        elevation={0}
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
        ]}>
        {rows.map((row, index) => (
          <View
            key={index}
            style={
              index > 0
                ? {
                    borderTopColor: colors.outlineVariant,
                    borderTopWidth: StyleSheet.hairlineWidth,
                  }
                : undefined
            }>
            {row}
          </View>
        ))}
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 8 },
  title: { marginLeft: 4 },
  card: { borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
});
