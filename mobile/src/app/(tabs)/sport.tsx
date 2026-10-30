import { ComingSoon } from '@/components/coming-soon';
import { Screen } from '@/components/screen';

export default function SportScreen() {
  return (
    <Screen title="Sport">
      <ComingSoon
        icon="run"
        title="Séances et objectifs sportifs"
        description="Historique des séances, durée, intensité, distance et objectifs."
        phase={10}
      />
    </Screen>
  );
}
