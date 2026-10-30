import { StyleSheet, View } from 'react-native';
import { Card, Chip, Icon, Text, useTheme } from 'react-native-paper';

type ComingSoonProps = {
  icon: string;
  title: string;
  description: string;
  /** Phase du plan de développement dans laquelle la fonctionnalité sera livrée. */
  phase: number;
};

/**
 * Emplacement d'une fonctionnalité pas encore développée.
 * Affiche explicitement « Bientôt disponible » : aucune donnée fictive n'est présentée.
 */
export function ComingSoon({ icon, title, description, phase }: ComingSoonProps) {
  const { colors } = useTheme();

  return (
    <Card mode="contained" accessibilityLabel={`${title} : bientôt disponible`}>
      <Card.Content style={styles.content}>
        <Icon source={icon} size={40} color={colors.primary} />
        <Text variant="titleMedium" style={styles.center}>
          {title}
        </Text>
        <Text variant="bodyMedium" style={[styles.center, { color: colors.onSurfaceVariant }]}>
          {description}
        </Text>
        <View style={styles.chips}>
          <Chip compact icon="clock-outline">
            Bientôt disponible
          </Chip>
          <Chip compact>{`Phase ${phase}`}</Chip>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  center: { textAlign: 'center' },
  chips: { flexDirection: 'row', gap: 8, marginTop: 4 },
});
