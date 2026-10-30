import { type Href, router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Icon, Surface, Text, TouchableRipple, useTheme } from 'react-native-paper';

import { ComingSoon } from '@/components/coming-soon';
import { IconBadge } from '@/components/icon-badge';
import { Screen } from '@/components/screen';
import { useMe } from '@/features/profile/queries';

/** Raccourcis vers les autres onglets (navigation uniquement, aucune donnée affichée). */
const SHORTCUTS = [
  { href: '/finances', icon: 'wallet-outline', label: 'Finances', tone: 'primary' },
  { href: '/sport', icon: 'run', label: 'Sport', tone: 'tertiary' },
  { href: '/stats', icon: 'chart-box-outline', label: 'Statistiques', tone: 'secondary' },
] as const satisfies readonly {
  href: Href;
  icon: string;
  label: string;
  tone: 'primary' | 'secondary' | 'tertiary';
}[];

export default function HomeScreen() {
  const { colors } = useTheme();
  const me = useMe();
  const firstName = me.data?.first_name;
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <Screen
      overline={today.charAt(0).toUpperCase() + today.slice(1)}
      title={firstName ? `Bonjour, ${firstName}` : 'Bonjour'}
      subtitle="Voici votre espace LifeTracker.">
      <View style={styles.shortcuts}>
        {SHORTCUTS.map((item) => (
          <Surface
            key={item.href}
            elevation={0}
            style={[
              styles.tile,
              { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
            ]}>
            <TouchableRipple
              onPress={() => router.navigate(item.href)}
              accessibilityRole="button"
              accessibilityLabel={`Ouvrir ${item.label}`}
              borderless
              style={styles.tileRipple}>
              <View style={styles.tileContent}>
                <IconBadge icon={item.icon} tone={item.tone} size={40} />
                <View style={styles.tileFooter}>
                  <Text variant="labelLarge" numberOfLines={1} style={styles.tileLabel}>
                    {item.label}
                  </Text>
                  <Icon source="chevron-right" size={18} color={colors.onSurfaceVariant} />
                </View>
              </View>
            </TouchableRipple>
          </Surface>
        ))}
      </View>

      <ComingSoon
        icon="view-dashboard-outline"
        title="Tableau de bord"
        description="Revenus et dépenses de la période, solde estimé, budgets, séances et dernières opérations."
        phase={12}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  shortcuts: { flexDirection: 'row', gap: 12 },
  tile: { flex: 1, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth },
  tileRipple: { borderRadius: 20 },
  tileContent: { padding: 14, gap: 14 },
  tileFooter: { flexDirection: 'row', alignItems: 'center' },
  tileLabel: { flex: 1 },
});
