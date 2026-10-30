import { darkTheme, getThemes, lightTheme } from '@/theme';

describe('getThemes', () => {
  it('utilise le thème sombre quand le téléphone est en mode sombre', () => {
    const { paper, navigation } = getThemes('dark');

    expect(paper).toBe(darkTheme);
    expect(paper.dark).toBe(true);
    expect(navigation.dark).toBe(true);
  });

  it.each(['light', null, undefined] as const)('utilise le thème clair pour %p', (scheme) => {
    const { paper, navigation } = getThemes(scheme);

    expect(paper).toBe(lightTheme);
    expect(navigation.dark).toBe(false);
  });

  it('applique la couleur de la marque aux deux thèmes', () => {
    expect(lightTheme.colors.primary).toBe('#1B6E5A');
    expect(darkTheme.colors.primary).not.toBe(lightTheme.colors.primary);
  });
});
