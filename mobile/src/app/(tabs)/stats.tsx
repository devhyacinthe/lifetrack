import { ComingSoon } from '@/components/coming-soon';
import { Screen } from '@/components/screen';

export default function StatsScreen() {
  return (
    <Screen title="Statistiques">
      <ComingSoon
        icon="chart-bar"
        title="Statistiques et mesures corporelles"
        description="Graphiques financiers et sportifs, poids et autres mesures."
        phase={11}
      />
    </Screen>
  );
}
