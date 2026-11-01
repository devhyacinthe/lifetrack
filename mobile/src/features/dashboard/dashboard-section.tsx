import type { Href } from 'expo-router';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';

type DashboardSectionProps = {
  title: string;
  /** Écran détaillé (« Tout voir »). */
  href: Href;
  /** Texte affiché quand la section n'a rien à montrer. */
  emptyMessage?: string;
  /** Action proposée dans l'état vide (ex. « Créer un budget »). */
  emptyAction?: { label: string; href: Href };
  isEmpty: boolean;
  children?: ReactNode;
};

/** Bloc de l'accueil : titre, lien vers l'écran détaillé, contenu ou état vide. */
export function DashboardSection({
  title,
  href,
  emptyMessage,
  emptyAction,
  isEmpty,
  children,
}: DashboardSectionProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.root}>
      <View style={styles.titleRow}>
        <Text variant="titleMedium" accessibilityRole="header" style={styles.flex}>
          {title}
        </Text>
        {!isEmpty ? (
          <Button
            compact
            onPress={() => router.push(href)}
            accessibilityLabel={`${title} : tout voir`}>
            Tout voir
          </Button>
        ) : null}
      </View>
      {isEmpty ? (
        <View
          style={[
            styles.empty,
            { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
          ]}>
          <Text variant="bodyMedium" style={[styles.flex, { color: colors.onSurfaceVariant }]}>
            {emptyMessage}
          </Text>
          {emptyAction ? (
            <Button mode="contained-tonal" compact onPress={() => router.push(emptyAction.href)}>
              {emptyAction.label}
            </Button>
          ) : null}
        </View>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', minHeight: 36 },
  flex: { flex: 1 },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    flexWrap: 'wrap',
  },
});
