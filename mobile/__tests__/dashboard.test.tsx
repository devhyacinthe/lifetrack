import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, renderHook, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { PaperProvider } from 'react-native-paper';

import { storeTokens } from '@/api/client';
import { getDashboard } from '@/api/dashboard';
import type { Dashboard } from '@/api/types';
import { BalanceHero } from '@/features/dashboard/balance-hero';
import { DashboardSection } from '@/features/dashboard/dashboard-section';
import { financeKeys } from '@/features/finance/queries';
import { createDomainKeys, DASHBOARD_KEY, useDomainMutation } from '@/lib/domain-queries';
import { lightTheme } from '@/theme';

function respond(status: number, body?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  } as Response;
}

const fetchMock = jest.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

beforeEach(async () => {
  fetchMock.mockReset();
  await storeTokens({ access: 'access-1', refresh: 'refresh-1' });
});

const dashboard: Dashboard = {
  reference_date: '2026-10-15',
  period_start: '2026-10-01',
  period_end: '2026-10-31',
  currency: 'XOF',
  finance: {
    income: '300000.00',
    expense: '45000.00',
    net: '255000.00',
    balance: '370000.00',
    accounts_count: 3,
    other_currencies: [{ currency: 'EUR', balance: '150.00', accounts_count: 1 }],
  },
  budgets: [],
  workouts: {
    period: 'monthly',
    period_start: '2026-10-01',
    period_end: '2026-10-31',
    sessions_count: 0,
    total_duration_seconds: 0,
    average_duration_seconds: 0,
    total_distance_km: '0.00',
    by_activity: [],
  },
  ongoing_session: null,
  workout_goals: [],
  latest_transactions: [],
  latest_sessions: [],
};

const withPaper = ({ children }: { children: ReactNode }) => (
  <PaperProvider theme={lightTheme}>{children}</PaperProvider>
);

describe('getDashboard', () => {
  it('appelle l’endpoint du tableau de bord', async () => {
    fetchMock.mockResolvedValueOnce(respond(200, dashboard));

    await expect(getDashboard()).resolves.toEqual(dashboard);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/api\/v1\/dashboard\/$/);
  });
});

describe('invalidation du tableau de bord', () => {
  it('toute écriture confirmée, quel que soit le domaine, invalide l’accueil', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(DASHBOARD_KEY, dashboard);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const bodyKeys = createDomainKeys<'measurements'>('body');

    const { result } = await renderHook(
      () => useDomainMutation(bodyKeys, 'measurements', async () => 'ok'),
      { wrapper },
    );
    await act(() => result.current.mutateAsync(undefined));

    expect(queryClient.getQueryState(DASHBOARD_KEY)?.isInvalidated).toBe(true);
    // Les clés des domaines restent séparées de celle de l'accueil.
    expect(financeKeys.all[0]).not.toBe(DASHBOARD_KEY[0]);
  });
});

describe('BalanceHero', () => {
  it('affiche le solde, le bilan du mois et les autres devises à part', async () => {
    await render(<BalanceHero dashboard={dashboard} />, { wrapper: withPaper });

    expect(screen.getByText(/370\s000\sXOF/)).toBeTruthy();
    expect(screen.getByText(/3 comptes actifs/)).toBeTruthy();
    expect(screen.getByText(/300\s000\sXOF/)).toBeTruthy();
    expect(screen.getByText(/Autres devises : 150,00\sEUR/)).toBeTruthy();
  });
});

describe('DashboardSection', () => {
  it('montre l’état vide et son action au lieu du lien « Tout voir »', async () => {
    await render(
      <DashboardSection
        title="Budgets"
        href="/budgets"
        isEmpty
        emptyMessage="Aucun budget."
        emptyAction={{ label: 'Créer', href: '/budgets/new' }}
      />,
      { wrapper: withPaper },
    );

    expect(screen.getByText('Aucun budget.')).toBeTruthy();
    expect(screen.getByText('Créer')).toBeTruthy();
    expect(screen.queryByText('Tout voir')).toBeNull();
  });
});
