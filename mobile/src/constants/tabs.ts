import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { SFSymbolIcon } from 'expo-router/native-tabs';
import type { ComponentProps } from 'react';

type SFSymbol = Extract<NonNullable<SFSymbolIcon['sf']>, string>;
type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type TabIcon = {
  /** SF Symbols (iOS) : contour au repos, version pleine quand l'onglet est sélectionné. */
  ios: { default: SFSymbol; selected: SFSymbol };
  /** MaterialCommunityIcons (Android), mêmes icônes que le reste de l'application. */
  android: { default: IconName; selected: IconName };
};

/**
 * Onglets de la navigation inférieure, dans l'ordre du cahier des charges.
 * `name` correspond au fichier de route dans src/app/(tabs)/.
 */
export const TABS: readonly { name: string; label: string; icon: TabIcon }[] = [
  {
    name: 'index',
    label: 'Accueil',
    icon: {
      ios: { default: 'house', selected: 'house.fill' },
      android: { default: 'home-outline', selected: 'home' },
    },
  },
  {
    name: 'finances',
    label: 'Finances',
    icon: {
      ios: { default: 'creditcard', selected: 'creditcard.fill' },
      android: { default: 'wallet-outline', selected: 'wallet' },
    },
  },
  {
    name: 'sport',
    label: 'Sport',
    icon: {
      ios: { default: 'dumbbell', selected: 'dumbbell.fill' },
      android: { default: 'arm-flex-outline', selected: 'arm-flex' },
    },
  },
  {
    name: 'stats',
    label: 'Statistiques',
    icon: {
      ios: { default: 'chart.bar', selected: 'chart.bar.fill' },
      android: { default: 'chart-box-outline', selected: 'chart-box' },
    },
  },
  {
    name: 'profile',
    label: 'Profil',
    icon: {
      ios: { default: 'person.crop.circle', selected: 'person.crop.circle.fill' },
      android: { default: 'account-circle-outline', selected: 'account-circle' },
    },
  },
];
