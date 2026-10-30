import { DarkTheme as NavigationDark, DefaultTheme as NavigationLight } from 'expo-router';
import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from 'react-native-paper';

/** Couleur principale de LifeTracker, déclinée pour chaque mode. */
const brand = {
  light: { primary: '#1B6E5A', onPrimary: '#FFFFFF', primaryContainer: '#A6F2D9' },
  dark: { primary: '#8AD6BD', onPrimary: '#00382B', primaryContainer: '#00513F' },
};

export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: { ...MD3LightTheme.colors, ...brand.light },
};

export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: { ...MD3DarkTheme.colors, ...brand.dark },
};

/** Thème de navigation (en-têtes, fonds d'écran) aligné sur les couleurs Paper. */
function toNavigationTheme(base: typeof NavigationLight, paper: MD3Theme): typeof NavigationLight {
  return {
    ...base,
    dark: paper.dark,
    colors: {
      ...base.colors,
      primary: paper.colors.primary,
      background: paper.colors.background,
      card: paper.colors.elevation.level2,
      text: paper.colors.onSurface,
      border: paper.colors.outlineVariant,
      notification: paper.colors.error,
    },
  };
}

const navigationLight = toNavigationTheme(NavigationLight, lightTheme);
const navigationDark = toNavigationTheme(NavigationDark, darkTheme);

export type ColorScheme = 'light' | 'dark' | null | undefined;

/** Thèmes Paper et navigation correspondant au mode du téléphone (clair par défaut). */
export function getThemes(scheme: ColorScheme) {
  const isDark = scheme === 'dark';
  return {
    paper: isDark ? darkTheme : lightTheme,
    navigation: isDark ? navigationDark : navigationLight,
  };
}
