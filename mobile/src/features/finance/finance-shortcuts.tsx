import { type Href, router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Surface, Text, TouchableRipple, useTheme } from 'react-native-paper';

import { IconBadge } from '@/components/icon-badge';

const SHORTCUTS = [
  { href: '/accounts', icon: 'wallet-outline', label: 'Comptes', tone: 'primary' },
  { href: '/budgets', icon: 'chart-donut', label: 'Budgets', tone: 'secondary' },
  { href: '/goals', icon: 'flag-checkered', label: 'Objectifs', tone: 'tertiary' },
  { href: '/categories', icon: 'shape-outline', label: 'Catégories', tone: 'secondary' },
] as const satisfies readonly {
  href: Href;
  icon: string;
  label: string;
  tone: 'primary' | 'secondary' | 'tertiary';
}[];

/** Accès aux écrans de gestion financière depuis l'onglet Finances. */
export function FinanceShortcuts() {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      {SHORTCUTS.map((item) => (
        <Surface
          key={item.href}
          elevation={0}
          style={[
            styles.tile,
            { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
          ]}>
          <TouchableRipple
            onPress={() => router.push(item.href)}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            borderless
            style={styles.ripple}>
            <View style={styles.content}>
              <IconBadge icon={item.icon} tone={item.tone} size={40} />
              <Text variant="labelMedium" numberOfLines={1}>
                {item.label}
              </Text>
            </View>
          </TouchableRipple>
        </Surface>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth },
  ripple: { borderRadius: 20 },
  content: { alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 4 },
});
