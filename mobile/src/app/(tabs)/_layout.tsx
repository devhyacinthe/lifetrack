import { NativeTabs } from 'expo-router/native-tabs';
import { useTheme } from 'react-native-paper';

import { TABS } from '@/constants/tabs';

/** Navigation inférieure à 5 entrées (maximum autorisé par Android). */
export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <NativeTabs
      backgroundColor={colors.elevation.level2}
      indicatorColor={colors.secondaryContainer}
      labelStyle={{ selected: { color: colors.onSurface } }}>
      {TABS.map((tab) => (
        <NativeTabs.Trigger key={tab.name} name={tab.name}>
          <NativeTabs.Trigger.Label>{tab.label}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={tab.icon.ios} md={tab.icon.android} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
