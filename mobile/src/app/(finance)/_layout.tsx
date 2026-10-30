import { Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';

/** Écrans financiers ouverts par-dessus les onglets (création, modification, catégories). */
export default function FinanceLayout() {
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
      <Stack.Screen name="transactions/new" options={{ title: 'Nouvelle transaction' }} />
      <Stack.Screen name="transactions/[id]" options={{ title: 'Transaction' }} />
      <Stack.Screen name="categories" options={{ title: 'Catégories' }} />
    </Stack>
  );
}
