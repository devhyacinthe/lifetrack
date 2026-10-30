import { ComingSoon } from '@/components/coming-soon';
import { Screen } from '@/components/screen';

export default function HomeScreen() {
  return (
    <Screen title="Accueil">
      <ComingSoon
        icon="view-dashboard-outline"
        title="Tableau de bord"
        description="Revenus et dépenses de la période, solde estimé, budgets, séances et dernières opérations."
        phase={12}
      />
    </Screen>
  );
}
