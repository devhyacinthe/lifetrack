import { categorySchema, transactionSchema } from '@/schemas/finance';

const valid = {
  type: 'expense' as const,
  amount: '12 500',
  category: 'cat-1',
  account: 'acc-1',
  date: '2026-10-30',
  description: '  Marché  ',
  payment_method: '' as const,
};

describe('transactionSchema', () => {
  it('normalise le montant et la description', () => {
    const result = transactionSchema.safeParse(valid);

    expect(result.success).toBe(true);
    expect(result.data?.amount).toBe('12500');
    expect(result.data?.description).toBe('Marché');
  });

  it.each([
    ['vide', ''],
    ['nul', '0'],
    ['trop de décimales', '12,345'],
    ['négatif', '-10'],
    ['non numérique', 'douze'],
  ])('refuse un montant %s', (_, amount) => {
    const result = transactionSchema.safeParse({ ...valid, amount });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['amount']);
  });

  it('exige une catégorie et un compte', () => {
    const result = transactionSchema.safeParse({ ...valid, category: '', account: '' });

    expect(result.error?.issues.map((i) => i.path[0]).sort()).toEqual(['account', 'category']);
  });

  it('refuse une date mal formée et un moyen de paiement inconnu', () => {
    expect(transactionSchema.safeParse({ ...valid, date: '30/10/2026' }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...valid, payment_method: 'bitcoin' }).success).toBe(
      false,
    );
  });

  it('limite la description à 255 caractères', () => {
    expect(transactionSchema.safeParse({ ...valid, description: 'x'.repeat(256) }).success).toBe(
      false,
    );
  });
});

describe('categorySchema', () => {
  it('exige un nom de 1 à 60 caractères', () => {
    expect(categorySchema.safeParse({ name: ' Épargne ', type: 'income' }).data?.name).toBe(
      'Épargne',
    );
    expect(categorySchema.safeParse({ name: '   ', type: 'income' }).success).toBe(false);
    expect(categorySchema.safeParse({ name: 'x'.repeat(61), type: 'income' }).success).toBe(false);
  });
});
