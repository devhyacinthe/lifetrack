import { renderRouter, screen } from 'expo-router/testing-library';

import { TABS } from '@/constants/tabs';

// Rend les vraies routes de l'application (src/app), pas une copie.
const APP_DIR = './src/app';

const fetchMock = jest.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

beforeEach(() => fetchMock.mockReset());

describe('navigation', () => {
  it('déclare exactement les 5 onglets du cahier des charges', () => {
    expect(TABS.map((tab) => tab.label)).toEqual([
      'Accueil',
      'Finances',
      'Sport',
      'Statistiques',
      'Profil',
    ]);
  });

  it("redirige vers la connexion quand aucune session n'est enregistrée", async () => {
    await renderRouter(APP_DIR, { initialUrl: '/finances' });

    expect(await screen.findByRole('header', { name: 'Connexion' })).toBeTruthy();
    expect(screen).toHavePathname('/login');
    expect(fetchMock).not.toHaveBeenCalled(); // aucun jeton : pas d'appel à l'API
  });
});
