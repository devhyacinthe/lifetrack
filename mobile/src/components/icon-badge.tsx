import { StyleSheet, View } from 'react-native';
import { Icon, useTheme } from 'react-native-paper';

type Tone = 'primary' | 'tertiary' | 'secondary' | 'error';

type IconBadgeProps = {
  icon: string;
  tone?: Tone;
  size?: number;
};

/** Icône dans une pastille arrondie teintée (en-têtes de cartes, listes). */
export function IconBadge({ icon, tone = 'primary', size = 44 }: IconBadgeProps) {
  const { colors } = useTheme();
  const tones: Record<Tone, { bg: string; fg: string }> = {
    primary: { bg: colors.primaryContainer, fg: colors.onPrimaryContainer },
    secondary: { bg: colors.secondaryContainer, fg: colors.onSecondaryContainer },
    tertiary: { bg: colors.tertiaryContainer, fg: colors.onTertiaryContainer },
    error: { bg: colors.errorContainer, fg: colors.onErrorContainer },
  };
  const { bg, fg } = tones[tone];

  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: size * 0.32, backgroundColor: bg },
      ]}
      importantForAccessibility="no-hide-descendants">
      <Icon source={icon} size={size * 0.5} color={fg} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center' },
});
