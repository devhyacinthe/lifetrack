import { useWindowDimensions } from 'react-native';
import { useTheme } from 'react-native-paper';

/**
 * Couleurs des séries (ordre fixe, jamais réordonné selon le classement), vérifiées pour
 * le daltonisme sur les surfaces claire et sombre de l'application. Trois couleurs claires
 * contrastent peu sur fond blanc : chaque graphique affiche donc ses valeurs en clair.
 */
export const SERIES_COLORS = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181'],
} as const;

/** Marges horizontales autour d'un graphique : écran (2 × 20) et carte (2 × 18). */
const HORIZONTAL_CHROME = 76;
/** Largeur réservée aux libellés de l'axe vertical. */
export const Y_AXIS_WIDTH = 44;

/**
 * Réglages communs des graphiques : couleurs des séries selon le thème, axes et grille
 * discrets, et largeur disponible pour la zone de tracé.
 */
export function useChartTheme() {
  const { colors, dark } = useTheme();
  const { width } = useWindowDimensions();

  return {
    series: dark ? SERIES_COLORS.dark : SERIES_COLORS.light,
    /** « Autres » : gris neutre, distinct des séries. */
    neutral: colors.outline,
    plotWidth: Math.max(width - HORIZONTAL_CHROME - Y_AXIS_WIDTH, 160),
    axis: {
      yAxisLabelWidth: Y_AXIS_WIDTH,
      yAxisThickness: 0,
      xAxisThickness: 1,
      xAxisColor: colors.outlineVariant,
      rulesColor: colors.outlineVariant,
      rulesType: 'solid' as const,
      yAxisTextStyle: { color: colors.onSurfaceVariant, fontSize: 11 },
      xAxisLabelTextStyle: { color: colors.onSurfaceVariant, fontSize: 11 },
      noOfSections: 4,
    },
  };
}
