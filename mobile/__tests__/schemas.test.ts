import { changePasswordSchema, loginSchema, profileSchema, registerSchema } from '@/schemas/auth';

const validRegistration = {
  first_name: '',
  last_name: '',
  email: 'ama@example.com',
  password: 'Mot-de-passe-2026',
  password_confirm: 'Mot-de-passe-2026',
};

describe('loginSchema', () => {
  it('exige un e-mail valide et un mot de passe', () => {
    expect(loginSchema.safeParse({ email: 'ama@example.com', password: 'x' }).success).toBe(true);
    expect(loginSchema.safeParse({ email: 'pas-un-email', password: 'x' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'ama@example.com', password: '' }).success).toBe(false);
  });
});

describe('registerSchema', () => {
  it('accepte une inscription valide', () => {
    expect(registerSchema.safeParse(validRegistration).success).toBe(true);
  });

  it.each([
    ['trop court', 'Ab-1'],
    ['uniquement des chiffres', '1234567890'],
  ])('refuse un mot de passe %s', (_, password) => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      password,
      password_confirm: password,
    });

    expect(result.success).toBe(false);
  });

  it('refuse une confirmation différente', () => {
    const result = registerSchema.safeParse({ ...validRegistration, password_confirm: 'autre' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['password_confirm']);
  });
});

describe('profileSchema', () => {
  it('met la devise en majuscules et vérifie son format', () => {
    const ok = profileSchema.safeParse({
      first_name: '',
      last_name: '',
      preferred_currency: 'eur',
      timezone: 'Europe/Paris',
    });

    expect(ok.success && ok.data.preferred_currency).toBe('EUR');
    expect(
      profileSchema.safeParse({
        first_name: '',
        last_name: '',
        preferred_currency: 'EURO',
        timezone: 'Europe/Paris',
      }).success,
    ).toBe(false);
  });
});

describe('changePasswordSchema', () => {
  it('exige la confirmation du nouveau mot de passe', () => {
    const base = { current_password: 'ancien', new_password: 'Nouveau-2026-ok' };

    expect(
      changePasswordSchema.safeParse({ ...base, new_password_confirm: 'Nouveau-2026-ok' }).success,
    ).toBe(true);
    expect(changePasswordSchema.safeParse({ ...base, new_password_confirm: 'autre' }).success).toBe(
      false,
    );
  });
});
