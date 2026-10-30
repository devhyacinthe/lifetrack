import { ComingSoon } from '@/components/coming-soon';
import { Screen } from '@/components/screen';

export default function StatsScreen() {
  return (
    <Screen title="Statistiques" subtitle="Graphiques financiers, sportifs et corporels.">
      <ComingSoon
        icon="chart-box-outline"
        title="Statistiques et mesures corporelles"
        description="Graphiques financiers et sportifs, poids et autres mesures."
        phase={11}
        tone="secondary"
      />
    </Screen>
  );
}
