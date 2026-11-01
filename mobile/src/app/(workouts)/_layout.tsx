import { Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';

/** Écrans sportifs ouverts par-dessus les onglets : séances, activités, objectifs. */
export default function WorkoutsLayout() {
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
      <Stack.Screen name="sessions/start" options={{ title: 'Démarrer une séance' }} />
      <Stack.Screen name="sessions/new" options={{ title: 'Séance passée' }} />
      <Stack.Screen name="sessions/[id]/index" options={{ title: 'Séance' }} />
      <Stack.Screen name="sessions/[id]/finish" options={{ title: 'Terminer la séance' }} />
      <Stack.Screen name="activities" options={{ title: 'Activités' }} />
      <Stack.Screen name="sport-goals/index" options={{ title: 'Objectifs sportifs' }} />
      <Stack.Screen name="sport-goals/new" options={{ title: 'Nouvel objectif' }} />
      <Stack.Screen name="sport-goals/[id]" options={{ title: 'Objectif sportif' }} />
    </Stack>
  );
}
