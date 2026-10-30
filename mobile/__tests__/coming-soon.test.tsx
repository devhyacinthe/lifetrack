import { render, screen } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';

import { ComingSoon } from '@/components/coming-soon';
import { Screen } from '@/components/screen';
import { lightTheme } from '@/theme';

describe('ComingSoon', () => {
  it('annonce clairement une fonctionnalité non disponible', async () => {
    await render(
      <PaperProvider theme={lightTheme}>
        <ComingSoon icon="run" title="Séances" description="Historique des séances." phase={10} />
      </PaperProvider>,
    );

    expect(screen.getByText('Séances')).toBeTruthy();
    expect(screen.getByText('Historique des séances.')).toBeTruthy();
    expect(screen.getByText('Bientôt disponible')).toBeTruthy();
    expect(screen.getByText('Phase 10')).toBeTruthy();
    expect(screen.getByLabelText('Séances : bientôt disponible')).toBeTruthy();
  });
});

describe('Screen', () => {
  it('expose le titre comme en-tête accessible', async () => {
    await render(
      <PaperProvider theme={lightTheme}>
        <Screen title="Finances">{null}</Screen>
      </PaperProvider>,
    );

    expect(screen.getByRole('header', { name: 'Finances' })).toBeTruthy();
  });
});
