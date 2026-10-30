/** Types des réponses réelles de l'API (voir docs/api-contract.md). */

export type TokenPair = {
  access: string;
  refresh: string;
};

export type User = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  preferred_currency: string;
  timezone: string;
  date_joined: string;
};

export type RegisterPayload = {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
};

export type ProfileUpdatePayload = Partial<
  Pick<User, 'first_name' | 'last_name' | 'preferred_currency' | 'timezone'>
>;

export type ChangePasswordPayload = {
  current_password: string;
  new_password: string;
};
