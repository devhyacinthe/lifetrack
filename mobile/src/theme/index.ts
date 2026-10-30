import { DarkTheme as NavigationDark, DefaultTheme as NavigationLight } from 'expo-router';
import { configureFonts, MD3DarkTheme, MD3LightTheme, type MD3Theme } from 'react-native-paper';

/**
 * Palette de LifeTracker, dérivée du vert de l'icône (#1B6E5A).
 * Fonds légèrement teintés et surfaces contrastées pour un rendu moderne.
 */
const palette = {
  light: {
    primary: '#14745C',
    onPrimary: '#FFFFFF',
    primaryContainer: '#C8F2E3',
    onPrimaryContainer: '#002118',
    secondary: '#4A6359',
    secondaryContainer: '#D3EDE2',
    onSecondaryContainer: '#062019',
    tertiary: '#E0892B',
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#FFE3C4',
    onTertiaryContainer: '#2E1500',
    background: '#F4F7F5',
    onBackground: '#161D1A',
    surface: '#FFFFFF',
    onSurface: '#161D1A',
    surfaceVariant: '#E6EDE9',
    onSurfaceVariant: '#55615C',
    outline: '#C2CCC7',
    outlineVariant: '#E1E7E3',
    elevation: {
      level0: 'transparent',
      level1: '#FFFFFF',
      level2: '#FFFFFF',
      level3: '#F7FAF8',
      level4: '#F3F7F5',
      level5: '#EFF5F2',
    },
  },
  dark: {
    primary: '#6FDBB8',
    onPrimary: '#00382B',
    primaryContainer: '#0B4F3F',
    onPrimaryContainer: '#C8F2E3',
    secondary: '#B3CCC1',
    secondaryContainer: '#2A3F37',
    onSecondaryContainer: '#D3EDE2',
    tertiary: '#FFB870',
    onTertiary: '#4A2800',
    tertiaryContainer: '#5E3A10',
    onTertiaryContainer: '#FFE3C4',
    background: '#0E1513',
    onBackground: '#DEE4E1',
    surface: '#161E1B',
    onSurface: '#DEE4E1',
    surfaceVariant: '#1F2925',
    onSurfaceVariant: '#A3B0AA',
    outline: '#3A4742',
    outlineVariant: '#26312D',
    elevation: {
      level0: 'transparent',
      level1: '#161E1B',
      level2: '#1A2420',
      level3: '#1E2925',
      level4: '#202C27',
      level5: '#232F2A',
    },
  },
};

const fonts = configureFonts({
  config: {
    headlineLarge: { fontWeight: '700', letterSpacing: -0.5 },
    headlineMedium: { fontWeight: '700', letterSpacing: -0.3 },
    headlineSmall: { fontWeight: '700' },
    titleLarge: { fontWeight: '700' },
    titleMedium: { fontWeight: '600' },
  },
});

export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: 4,
  fonts,
  colors: { ...MD3LightTheme.colors, ...palette.light },
};

export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  roundness: 4,
  fonts,
  colors: { ...MD3DarkTheme.colors, ...palette.dark },
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
      card: paper.colors.surface,
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
