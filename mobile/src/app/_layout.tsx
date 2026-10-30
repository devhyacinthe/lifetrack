import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';

import { ApiError } from '@/api/errors';
import { AuthProvider, useAuth } from '@/auth/auth-context';
import { getThemes } from '@/theme';

SplashScreen.preventAutoHideAsync();

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Pas de nouvel essai sur une erreur du serveur (4xx) : seulement sur le réseau.
        retry: (failureCount, error) => !(error instanceof ApiError) && failureCount < 2,
        staleTime: 30_000,
      },
    },
  });
}

/** Garde de navigation : les onglets exigent une session, les écrans d'accès l'interdisent. */
function RootNavigator() {
  const { status } = useAuth();

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hideAsync();
  }, [status]);

  if (status === 'loading') return null; // l'écran de démarrage reste affiché

  const signedIn = status === 'signedIn';
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(finance)" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const { paper, navigation } = getThemes(useColorScheme());
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PaperProvider theme={paper}>
          <ThemeProvider value={navigation}>
            <StatusBar style="auto" />
            <RootNavigator />
          </ThemeProvider>
        </PaperProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
