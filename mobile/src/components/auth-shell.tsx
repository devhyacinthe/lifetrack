import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Surface, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const logo = require('../../assets/images/icon.png');

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};

/** Mise en page des écrans d'accès : bandeau de marque avec logo, puis carte du formulaire. */
export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  const { colors, dark } = useTheme();
  const heroColor = dark ? colors.primaryContainer : colors.primary;
  const onHero = dark ? colors.onPrimaryContainer : colors.onPrimary;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={[styles.hero, { backgroundColor: heroColor }]}>
            {/* Cercles décoratifs */}
            <View style={[styles.blob, styles.blobTop, { backgroundColor: onHero }]} />
            <View style={[styles.blob, styles.blobBottom, { backgroundColor: onHero }]} />
            <SafeAreaView edges={['top']} style={styles.heroContent}>
              <Image
                source={logo}
                style={styles.logo}
                contentFit="cover"
                accessibilityLabel="Logo LifeTracker"
              />
              <Text variant="headlineMedium" style={{ color: onHero }}>
                LifeTracker
              </Text>
              <Text variant="bodyMedium" style={[styles.tagline, { color: onHero }]}>
                Vos finances et votre sport, au même endroit.
              </Text>
            </SafeAreaView>
          </View>

          <Surface elevation={2} style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.cardHeader}>
              <Text variant="headlineSmall" accessibilityRole="header">
                {title}
              </Text>
              <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
                {subtitle}
              </Text>
            </View>
            {children}
          </Surface>

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: 32 },
  hero: {
    paddingBottom: 72,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
  },
  heroContent: { alignItems: 'center', gap: 6, paddingTop: 24, paddingHorizontal: 24 },
  logo: { width: 84, height: 84, borderRadius: 24, marginBottom: 8 },
  tagline: { opacity: 0.85, textAlign: 'center' },
  blob: { position: 'absolute', borderRadius: 999, opacity: 0.08 },
  blobTop: { width: 260, height: 260, top: -120, right: -80 },
  blobBottom: { width: 180, height: 180, bottom: -70, left: -50 },
  card: { marginTop: -48, marginHorizontal: 20, borderRadius: 28, padding: 22, gap: 14 },
  cardHeader: { gap: 4, marginBottom: 4 },
  footer: { alignItems: 'center', marginTop: 12 },
});
