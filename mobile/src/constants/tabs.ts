/**
 * Onglets de la navigation inférieure, dans l'ordre du cahier des charges.
 * `name` correspond au fichier de route dans src/app/(tabs)/.
 * Icônes : SF Symbols (iOS) et Material Symbols (Android).
 */
export const TABS = [
  { name: 'index', label: 'Accueil', icon: { ios: 'house.fill', android: 'home' } },
  {
    name: 'finances',
    label: 'Finances',
    icon: { ios: 'creditcard.fill', android: 'account_balance_wallet' },
  },
  { name: 'sport', label: 'Sport', icon: { ios: 'figure.run', android: 'fitness_center' } },
  { name: 'stats', label: 'Statistiques', icon: { ios: 'chart.bar.fill', android: 'bar_chart' } },
  { name: 'profile', label: 'Profil', icon: { ios: 'person.crop.circle.fill', android: 'person' } },
] as const;
