import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { TABS } from '@/constants/tabs';

// Rend les vraies routes de l'application (src/app), pas une copie.
const APP_DIR = './src/app';

describe('navigation', () => {
  it("s'ouvre sur l'onglet Accueil", async () => {
    await renderRouter(APP_DIR, { initialUrl: '/' });

    expect(screen).toHavePathname('/');
    expect(screen.getByRole('header', { name: 'Accueil' })).toBeTruthy();
  });

  it('déclare exactement les 5 onglets du cahier des charges', () => {
    expect(TABS.map((tab) => tab.label)).toEqual([
      'Accueil',
      'Finances',
      'Sport',
      'Statistiques',
      'Profil',
    ]);
  });

  it.each([
    ['/finances', 'Finances'],
    ['/sport', 'Sport'],
    ['/stats', 'Statistiques'],
    ['/profile', 'Profil'],
  ])("affiche l'écran %s", async (url, title) => {
    await renderRouter(APP_DIR, { initialUrl: url });

    expect(screen).toHavePathname(url);
    expect(screen.getByRole('header', { name: title })).toBeTruthy();
  });

  it("ouvre l'écran de connexion depuis le profil, puis l'inscription", async () => {
    await renderRouter(APP_DIR, { initialUrl: '/profile' });

    fireEvent.press(screen.getByText('Aperçu de l’écran de connexion'));
    expect(await screen.findByRole('header', { name: 'Connexion' })).toBeTruthy();
    expect(screen).toHavePathname('/login');

    fireEvent.press(screen.getByText('Pas encore de compte ? S’inscrire'));
    expect(await screen.findByRole('header', { name: 'Inscription' })).toBeTruthy();
    expect(screen).toHavePathname('/register');
  });
});
