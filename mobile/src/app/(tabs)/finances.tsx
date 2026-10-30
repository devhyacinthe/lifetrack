import { ComingSoon } from '@/components/coming-soon';
import { Screen } from '@/components/screen';

export default function FinancesScreen() {
  return (
    <Screen title="Finances">
      <ComingSoon
        icon="swap-vertical"
        title="Transactions"
        description="Revenus et dépenses : saisie, recherche, filtres et modification."
        phase={7}
      />
      <ComingSoon
        icon="wallet-outline"
        title="Comptes, budgets et objectifs"
        description="Espèces, banque, Mobile Money, épargne, budgets et objectifs d'épargne."
        phase={8}
      />
    </Screen>
  );
}
