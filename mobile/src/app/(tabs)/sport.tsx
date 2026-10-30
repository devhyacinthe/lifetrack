import { ComingSoon } from '@/components/coming-soon';
import { Screen } from '@/components/screen';

export default function SportScreen() {
  return (
    <Screen title="Sport" subtitle="Séances, progression et objectifs.">
      <ComingSoon
        icon="run"
        title="Séances et objectifs sportifs"
        description="Historique des séances, durée, intensité, distance et objectifs."
        phase={10}
        tone="tertiary"
      />
    </Screen>
  );
}
