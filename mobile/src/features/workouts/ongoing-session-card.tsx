import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Button, Icon, Text, useTheme } from 'react-native-paper';

import type { Workout } from '@/api/types';
import { IconBadge } from '@/components/icon-badge';

import { elapsedSeconds, formatElapsed, localTimeOf } from './format';
import { activityIcon } from './labels';

/** Chronomètre mis à jour chaque seconde (affichage seulement, la durée est saisie à la fin). */
function useElapsed(startedAt: string) {
  const [seconds, setSeconds] = useState(() => elapsedSeconds(startedAt));
  useEffect(() => {
    const timer = setInterval(() => setSeconds(elapsedSeconds(startedAt)), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);
  return seconds;
}

/**
 * Séance en cours, en haut de l'onglet Sport. Glisser vers la droite (ou toucher
 * « Terminer ») ouvre le formulaire de fin : durée, intensité, distance, calories.
 */
export function OngoingSessionCard({ session }: { session: Workout }) {
  const { colors, dark } = useTheme();
  const swipeable = useRef<SwipeableMethods>(null);
  const seconds = useElapsed(session.started_at);
  const heroColor = dark ? colors.primaryContainer : colors.primary;
  const onHero = dark ? colors.onPrimaryContainer : colors.onPrimary;

  const finish = () => {
    swipeable.current?.close();
    router.push({ pathname: '/sessions/[id]/finish', params: { id: session.id } });
  };

  return (
    <ReanimatedSwipeable
      ref={swipeable}
      friction={1.5}
      leftThreshold={80}
      overshootLeft={false}
      onSwipeableOpen={finish}
      containerStyle={styles.container}
      renderLeftActions={() => (
        <View style={[styles.action, { backgroundColor: colors.tertiary }]}>
          <Icon source="flag-checkered" size={28} color={colors.onTertiary} />
          <Text variant="labelLarge" style={{ color: colors.onTertiary }}>
            Terminer
          </Text>
        </View>
      )}>
      <View
        style={[styles.card, { backgroundColor: heroColor }]}
        accessible
        accessibilityLabel={`Séance en cours : ${session.activity_name}, depuis ${localTimeOf(session.started_at)}`}
        accessibilityHint="Glissez vers la droite ou utilisez le bouton Terminer"
        accessibilityActions={[{ name: 'activate', label: 'Terminer la séance' }]}
        onAccessibilityAction={finish}>
        <View style={styles.header}>
          <IconBadge icon={activityIcon(session.activity_name)} tone="tertiary" size={44} />
          <View style={styles.headerText}>
            <Text variant="labelLarge" style={[styles.dim, { color: onHero }]}>
              {`En cours · depuis ${localTimeOf(session.started_at)}`}
            </Text>
            <Text variant="titleLarge" numberOfLines={1} style={{ color: onHero }}>
              {session.activity_name}
            </Text>
          </View>
        </View>
        <Text variant="displaySmall" style={[styles.timer, { color: onHero }]}>
          {formatElapsed(seconds)}
        </Text>
        <View style={styles.footer}>
          <View style={styles.hint}>
            <Icon source="gesture-swipe-right" size={18} color={onHero} />
            <Text variant="bodySmall" style={[styles.dim, { color: onHero }]}>
              Glissez pour terminer
            </Text>
          </View>
          <Button
            mode="contained-tonal"
            compact
            onPress={() => router.push({ pathname: '/sessions/[id]', params: { id: session.id } })}>
            Modifier
          </Button>
          <Button
            mode="contained"
            compact
            icon="flag-checkered"
            onPress={finish}
            buttonColor={colors.tertiary}
            textColor={colors.onTertiary}>
            Terminer
          </Button>
        </View>
      </View>
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 28 },
  card: { borderRadius: 28, padding: 20, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1, gap: 2 },
  dim: { opacity: 0.85 },
  timer: { fontWeight: '700', fontVariant: ['tabular-nums'] },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  hint: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 140 },
  action: {
    width: 120,
    borderRadius: 28,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
});
