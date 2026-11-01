import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { NativeTabs } from 'expo-router/native-tabs';
import { useTheme } from 'react-native-paper';

import { TABS } from '@/constants/tabs';

/**
 * Navigation inférieure à 5 entrées (maximum autorisé par Android), libellés toujours visibles.
 * Icône en contour au repos, pleine sur l'onglet actif, posée sur une pastille (Material 3).
 */
export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <NativeTabs
      backgroundColor={colors.elevation.level2}
      indicatorColor={colors.secondaryContainer}
      rippleColor={colors.secondaryContainer}
      labelVisibilityMode="labeled"
      iconColor={{ default: colors.onSurfaceVariant, selected: colors.onSecondaryContainer }}
      labelStyle={{
        default: { color: colors.onSurfaceVariant, fontSize: 12, fontWeight: '500' },
        selected: { color: colors.onSurface, fontSize: 12, fontWeight: '700' },
      }}>
      {TABS.map((tab) => (
        <NativeTabs.Trigger key={tab.name} name={tab.name}>
          <NativeTabs.Trigger.Label>{tab.label}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={tab.icon.ios}
            src={{
              default: (
                <NativeTabs.Trigger.VectorIcon
                  family={MaterialCommunityIcons}
                  name={tab.icon.android.default}
                />
              ),
              selected: (
                <NativeTabs.Trigger.VectorIcon
                  family={MaterialCommunityIcons}
                  name={tab.icon.android.selected}
                />
              ),
            }}
          />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
