import { Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';

/** Écrans financiers ouverts par-dessus les onglets : comptes, transferts, budgets, objectifs… */
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
      <Stack.Screen name="accounts/index" options={{ title: 'Comptes' }} />
      <Stack.Screen name="accounts/new" options={{ title: 'Nouveau compte' }} />
      <Stack.Screen name="accounts/[id]" options={{ title: 'Compte' }} />
      <Stack.Screen name="transfers/index" options={{ title: 'Transferts' }} />
      <Stack.Screen name="transfers/new" options={{ title: 'Nouveau transfert' }} />
      <Stack.Screen name="transfers/[id]" options={{ title: 'Transfert' }} />
      <Stack.Screen name="budgets/index" options={{ title: 'Budgets' }} />
      <Stack.Screen name="budgets/new" options={{ title: 'Nouveau budget' }} />
      <Stack.Screen name="budgets/[id]" options={{ title: 'Budget' }} />
      <Stack.Screen name="goals/index" options={{ title: 'Objectifs d’épargne' }} />
      <Stack.Screen name="goals/new" options={{ title: 'Nouvel objectif' }} />
      <Stack.Screen name="goals/[id]" options={{ title: 'Objectif' }} />
    </Stack>
  );
}
