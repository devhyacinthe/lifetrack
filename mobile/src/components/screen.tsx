import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

type ScreenProps = {
  title: string;
  /** Petite ligne au-dessus du titre (salutation, date…). */
  overline?: string;
  subtitle?: string;
  children: ReactNode;
};

/** Conteneur commun des écrans : marges sûres, défilement et grand titre accessible. */
export function Screen({ title, overline, subtitle, children }: ScreenProps) {
  const { colors } = useTheme();

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          {overline ? (
            <Text variant="labelLarge" style={{ color: colors.primary }}>
              {overline}
            </Text>
          ) : null}
          <Text variant="headlineLarge" accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, gap: 16 },
  header: { gap: 4, marginBottom: 8 },
});
