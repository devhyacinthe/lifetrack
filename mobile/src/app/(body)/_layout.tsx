import { Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';

/** Écrans des mesures corporelles ouverts par-dessus les onglets. */
export default function BodyLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.onSurface,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: colors.background },
        headerBackButtonDisplayMode: 'minimal',
      }}>
      <Stack.Screen name="measurements/index" options={{ title: 'Mesures corporelles' }} />
      <Stack.Screen name="measurements/new" options={{ title: 'Nouvelle mesure' }} />
      <Stack.Screen name="measurements/[typeId]" options={{ title: 'Mesure' }} />
      <Stack.Screen name="measurements/entry/[id]" options={{ title: 'Modifier la mesure' }} />
    </Stack>
  );
}
