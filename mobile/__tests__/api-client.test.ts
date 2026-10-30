import { apiRequest, onSessionExpired, storeTokens } from '@/api/client';
import { ApiError, NetworkError } from '@/api/errors';
import { tokenStore } from '@/api/token-store';

type MockResponse = { status: number; body?: unknown };

function respond({ status, body }: MockResponse): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  } as Response;
}

const fetchMock = jest.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

function calls(path: string) {
  return fetchMock.mock.calls.filter(([url]) => String(url).endsWith(path)).length;
}

beforeEach(async () => {
  fetchMock.mockReset();
  tokenStore.setAccess(null);
  onSessionExpired(null);
  await storeTokens({ access: 'access-1', refresh: 'refresh-1' });
});

describe('apiRequest', () => {
  it("envoie le jeton d'accès et décode la réponse", async () => {
    fetchMock.mockResolvedValueOnce(respond({ status: 200, body: { email: 'a@example.com' } }));

    const data = await apiRequest<{ email: string }>('/auth/me/');

    expect(data.email).toBe('a@example.com');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.test/api/v1/auth/me/');
    expect(init.headers.Authorization).toBe('Bearer access-1');
  });

  it("n'envoie pas de jeton aux endpoints publics", async () => {
    fetchMock.mockResolvedValueOnce(respond({ status: 200, body: {} }));

    await apiRequest('/auth/login/', { method: 'POST', body: {}, auth: false });

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('renouvelle le jeton sur un 401 puis rejoue la requête une seule fois', async () => {
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      if (url.endsWith('/auth/token/refresh/')) {
        return respond({ status: 200, body: { access: 'access-2', refresh: 'refresh-2' } });
      }
      const auth = (init.headers as Record<string, string>).Authorization;
      return respond(
        auth === 'Bearer access-2' ? { status: 200, body: { ok: true } } : { status: 401 },
      );
    });

    await expect(apiRequest('/auth/me/')).resolves.toEqual({ ok: true });
    expect(calls('/auth/token/refresh/')).toBe(1);
    expect(await tokenStore.getRefresh()).toBe('refresh-2'); // rotation enregistrée
  });

  it('partage un seul renouvellement entre plusieurs requêtes simultanées', async () => {
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      if (url.endsWith('/auth/token/refresh/')) {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return respond({ status: 200, body: { access: 'access-2', refresh: 'refresh-2' } });
      }
      const auth = (init.headers as Record<string, string>).Authorization;
      return respond(auth === 'Bearer access-2' ? { status: 200, body: {} } : { status: 401 });
    });

    await Promise.all([apiRequest('/a/'), apiRequest('/b/'), apiRequest('/c/')]);

    // Le jeton de renouvellement est à usage unique : un seul appel est autorisé.
    expect(calls('/auth/token/refresh/')).toBe(1);
  });

  it('déconnecte sans boucle si le renouvellement échoue', async () => {
    const expired = jest.fn();
    onSessionExpired(expired);
    fetchMock.mockImplementation(async (url: string) =>
      respond(url.endsWith('/auth/token/refresh/') ? { status: 401 } : { status: 401 }),
    );

    await expect(apiRequest('/auth/me/')).rejects.toMatchObject({ status: 401 });
    expect(calls('/auth/token/refresh/')).toBe(1);
    expect(calls('/auth/me/')).toBe(1);
    expect(expired).toHaveBeenCalledTimes(1);
    expect(await tokenStore.getRefresh()).toBeNull();
  });

  it('ne rejoue pas indéfiniment si le nouveau jeton est aussi refusé', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith('/auth/token/refresh/')
        ? respond({ status: 200, body: { access: 'access-2', refresh: 'refresh-2' } })
        : respond({ status: 401 }),
    );

    await expect(apiRequest('/auth/me/')).rejects.toBeInstanceOf(ApiError);
    expect(calls('/auth/me/')).toBe(2); // requête initiale + une seule nouvelle tentative
    expect(calls('/auth/token/refresh/')).toBe(1);
  });

  it('transforme une erreur réseau en NetworkError', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));

    await expect(apiRequest('/auth/me/')).rejects.toBeInstanceOf(NetworkError);
  });

  it('expose les erreurs de validation par champ', async () => {
    fetchMock.mockResolvedValueOnce(
      respond({
        status: 400,
        body: { email: ['Un compte existe déjà avec cette adresse e-mail.'] },
      }),
    );

    await expect(
      apiRequest('/auth/register/', { method: 'POST', body: {}, auth: false }),
    ).rejects.toMatchObject({
      status: 400,
      fieldErrors: { email: ['Un compte existe déjà avec cette adresse e-mail.'] },
    });
  });
});
