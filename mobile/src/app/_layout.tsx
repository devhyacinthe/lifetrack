import { Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';

import { getThemes } from '@/theme';

export default function RootLayout() {
  const { paper, navigation } = getThemes(useColorScheme());

  return (
    <PaperProvider theme={paper}>
      <ThemeProvider value={navigation}>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
        </Stack>
      </ThemeProvider>
    </PaperProvider>
  );
}
