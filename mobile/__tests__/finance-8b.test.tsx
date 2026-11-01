import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { storeTokens } from '@/api/client';
import { toBudgetPayload } from '@/features/finance/budget-form';
import { formatPeriodRange, normalizeSignedAmountInput } from '@/features/finance/format';
import { toGoalPayload } from '@/features/finance/goal-form';
import { financeKeys, useDeleteBudget } from '@/features/finance/queries';
import { accountSchema, budgetSchema, goalSchema, transferSchema } from '@/schemas/finance';

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

describe('normalizeSignedAmountInput', () => {
  it.each([
    ['-2 500,50', '-2500.50'],
    ['−100', '-100'], // signe moins typographique
    ['150000', '150000'],
    ['-0', '0'],
  ])('convertit « %s » en %s', (input, expected) => {
    expect(normalizeSignedAmountInput(input)).toBe(expected);
  });

  it.each(['--5', '5-', '-', 'abc', '-1,234'])('refuse « %s »', (input) => {
    expect(normalizeSignedAmountInput(input)).toBeNull();
  });
});

describe('formatPeriodRange', () => {
  it("n'écrit l'année de début que si elle diffère de celle de fin", () => {
    expect(formatPeriodRange('2026-11-01', '2026-11-30')).toMatch(/^1 nov\.? – 30 nov\.? 2026$/);
    expect(formatPeriodRange('2026-12-28', '2027-01-03')).toMatch(/2026 – 3 janv\.? 2027$/);
  });
});

describe('accountSchema', () => {
  const base = { name: 'Banque', type: 'bank' as const, currency: 'xof', initial_balance: '' };

  it('met la devise en majuscules et accepte un solde vide (0) ou négatif', () => {
    expect(accountSchema.parse(base)).toMatchObject({ currency: 'XOF', initial_balance: '0' });
    expect(accountSchema.parse({ ...base, initial_balance: '-1 000' }).initial_balance).toBe(
      '-1000',
    );
  });

  it('refuse une devise invalide et un nom vide', () => {
    expect(accountSchema.safeParse({ ...base, currency: 'EURO' }).success).toBe(false);
    expect(accountSchema.safeParse({ ...base, name: '  ' }).success).toBe(false);
  });
});

describe('transferSchema', () => {
  const base = {
    from_account: 'a',
    to_account: 'b',
    amount: '5000',
    date: '2026-11-01',
    description: '',
  };

  it('accepte deux comptes différents', () => {
    expect(transferSchema.safeParse(base).success).toBe(true);
  });

  it('refuse le même compte des deux côtés, avec l’erreur sur le compte crédité', () => {
    const result = transferSchema.safeParse({ ...base, to_account: 'a' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['to_account']);
  });
});

describe('budgetSchema et toBudgetPayload', () => {
  it('transforme une catégorie vide en budget global (null)', () => {
    const values = budgetSchema.parse({
      category: '',
      amount: '60 000',
      period: 'monthly',
      currency: 'xof',
    });

    expect(toBudgetPayload(values)).toEqual({
      category: null,
      amount: '60000',
      period: 'monthly',
      currency: 'XOF',
    });
  });

  it('refuse une période inconnue et un montant nul', () => {
    const base = { category: '', amount: '1', period: 'monthly', currency: 'XOF' };
    expect(budgetSchema.safeParse({ ...base, period: 'daily' }).success).toBe(false);
    expect(budgetSchema.safeParse({ ...base, amount: '0' }).success).toBe(false);
  });
});

describe('goalSchema et toGoalPayload', () => {
  const base = { name: 'Moto', account: 'acc', target_amount: '500000', deadline: '' };

  it('transforme une échéance vide en null', () => {
    expect(toGoalPayload(goalSchema.parse(base)).deadline).toBeNull();
    expect(toGoalPayload(goalSchema.parse({ ...base, deadline: '2027-06-30' })).deadline).toBe(
      '2027-06-30',
    );
  });

  it('exige un compte et une échéance bien formée', () => {
    expect(goalSchema.safeParse({ ...base, account: '' }).success).toBe(false);
    expect(goalSchema.safeParse({ ...base, deadline: '30/06/2027' }).success).toBe(false);
  });
});

describe('invalidation après une écriture', () => {
  it('recharge les listes financières mais ne redemande pas le détail supprimé', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const listFn = jest.fn().mockResolvedValue([]);
    const detailFn = jest.fn().mockResolvedValue({ id: 'b1' });
    // En cache : une liste (comptes) et le détail du budget qui va être supprimé.
    await queryClient.fetchQuery({ queryKey: financeKeys.list('accounts'), queryFn: listFn });
    await queryClient.fetchQuery({
      queryKey: financeKeys.detail('budgets', 'b1'),
      queryFn: detailFn,
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    fetchMock.mockResolvedValueOnce(respond(204));
    const { result } = await renderHook(() => useDeleteBudget('b1'), { wrapper });

    await act(() => result.current.mutateAsync());

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.test/api/v1/finance/budgets/b1/');
    expect(init.method).toBe('DELETE');
    expect(queryClient.getQueryState(financeKeys.list('accounts'))?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(financeKeys.detail('budgets', 'b1'))?.isInvalidated).toBe(
      true,
    );
    expect(detailFn).toHaveBeenCalledTimes(1); // aucun rechargement du détail (pas de 404)
  });
});
