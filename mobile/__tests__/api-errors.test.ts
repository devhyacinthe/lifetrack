import { ApiError, errorMessage, NetworkError, toApiError } from '@/api/errors';

describe('toApiError', () => {
  it('sépare les erreurs par champ du message général', () => {
    const error = toApiError(400, { password: ['Trop court.'], non_field_errors: ['Invalide.'] });

    expect(error.fieldErrors).toEqual({ password: ['Trop court.'] });
    expect(error.message).toBe('Invalide.');
  });

  it('utilise detail comme message', () => {
    expect(toApiError(409, { detail: 'Compte utilisé.' }).message).toBe('Compte utilisé.');
  });

  it('donne un message lisible sans corps de réponse', () => {
    expect(toApiError(429, undefined).message).toMatch(/Trop de tentatives/);
    expect(toApiError(500, undefined).message).toMatch(/erreur est survenue/);
  });

  it('ignore les champs techniques de SimpleJWT', () => {
    const error = toApiError(401, {
      detail: 'Jeton invalide.',
      code: 'token_not_valid',
      messages: [],
    });

    expect(error.fieldErrors).toEqual({});
  });
});

describe('errorMessage', () => {
  it('renvoie le message des erreurs connues et un message générique sinon', () => {
    expect(errorMessage(new ApiError(404, 'Introuvable.'))).toBe('Introuvable.');
    expect(errorMessage(new NetworkError())).toMatch(/joindre le serveur/);
    expect(errorMessage(new Error('détail interne'))).toBe('Une erreur inattendue est survenue.');
  });
});
