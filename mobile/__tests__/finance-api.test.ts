import { storeTokens } from '@/api/client';
import { ApiError } from '@/api/errors';
import {
  deleteCategory,
  listCategories,
  listTransactions,
  toQueryString,
  updateTransaction,
} from '@/api/finance';

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

describe('toQueryString', () => {
  it('ignore les valeurs vides et encode les autres', () => {
    expect(toQueryString({ search: 'café & thé', type: undefined, category: '', page: 2 })).toBe(
      '?search=caf%C3%A9%20%26%20th%C3%A9&page=2',
    );
    expect(toQueryString({})).toBe('');
  });
});

describe('listTransactions', () => {
  it('transmet les filtres, la page et la taille de page', async () => {
    fetchMock.mockResolvedValueOnce(
      respond(200, { count: 0, next: null, previous: null, results: [] }),
    );

    await listTransactions({ type: 'expense', date_after: '2026-10-01', ordering: '-amount' }, 3);

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe(
      'https://api.test/api/v1/finance/transactions/?type=expense&date_after=2026-10-01&ordering=-amount&page=3&page_size=20',
    );
  });
});

describe('listCategories', () => {
  it('parcourt toutes les pages', async () => {
    fetchMock
      .mockResolvedValueOnce(
        respond(200, {
          count: 2,
          next: 'https://api.test/…?page=2',
          previous: null,
          results: [{ id: 'a' }],
        }),
      )
      .mockResolvedValueOnce(
        respond(200, { count: 2, next: null, previous: '…', results: [{ id: 'b' }] }),
      );

    const categories = await listCategories();

    expect(categories.map((c) => c.id)).toEqual(['a', 'b']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain('page=2&page_size=100');
  });
});

describe('écritures', () => {
  it('modifie une transaction avec PATCH', async () => {
    fetchMock.mockResolvedValueOnce(respond(200, { id: 't1' }));

    await updateTransaction('t1', { amount: '10' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.test/api/v1/finance/transactions/t1/');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body)).toEqual({ amount: '10' });
  });

  it('remonte le 409 d’une catégorie utilisée', async () => {
    fetchMock.mockResolvedValueOnce(
      respond(409, { detail: 'Cette catégorie est utilisée par des transactions.' }),
    );

    const error = await deleteCategory('c1').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(409);
  });
});
