import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

export type LegendItem = {
  key: string;
  label: string;
  color: string;
  /** Valeur écrite en clair : l'identité ne repose jamais sur la couleur seule. */
  value?: string;
  detail?: string;
};

/**
 * Légende d'un graphique : pastille de couleur, libellé et valeur. Le texte garde les
 * couleurs du thème ; seule la pastille porte la couleur de la série.
 */
export function Legend({
  items,
  layout = 'row',
}: {
  items: LegendItem[];
  layout?: 'row' | 'list';
}) {
  const { colors } = useTheme();

  return (
    <View style={layout === 'row' ? styles.row : styles.list}>
      {items.map((item) => (
        <View
          key={item.key}
          style={layout === 'row' ? styles.rowItem : styles.listItem}
          accessible
          accessibilityLabel={[item.label, item.value, item.detail].filter(Boolean).join(', ')}>
          <View style={[styles.swatch, { backgroundColor: item.color }]} />
          <Text
            variant="bodyMedium"
            numberOfLines={1}
            style={layout === 'list' ? styles.listLabel : undefined}>
            {item.label}
          </Text>
          {item.value ? (
            <Text variant="titleSmall" style={styles.value}>
              {item.value}
            </Text>
          ) : null}
          {item.detail ? (
            <Text variant="bodySmall" style={[styles.detail, { color: colors.onSurfaceVariant }]}>
              {item.detail}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 8 },
  rowItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  list: { gap: 10 },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  listLabel: { flex: 1 },
  swatch: { width: 12, height: 12, borderRadius: 4 },
  value: { fontVariant: ['tabular-nums'] },
  detail: { minWidth: 48, textAlign: 'right', fontVariant: ['tabular-nums'] },
});
