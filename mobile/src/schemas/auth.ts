/**
 * Validation des formulaires avant envoi. Le backend reste la référence : ses erreurs
 * (mot de passe trop courant, e-mail déjà utilisé…) sont affichées sous les champs.
 */
import { z } from 'zod';

const email = z
  .string()
  .trim()
  .min(1, "L'adresse e-mail est obligatoire.")
  .email('Adresse e-mail invalide.');

/** Mêmes règles de base que les validateurs Django (longueur, uniquement des chiffres). */
const newPassword = z
  .string()
  .min(8, 'Au moins 8 caractères.')
  .max(128, 'Au plus 128 caractères.')
  .refine(
    (value) => !/^\d+$/.test(value),
    'Le mot de passe ne peut pas contenir que des chiffres.',
  );

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Le mot de passe est obligatoire.'),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    first_name: z.string().trim().max(150),
    last_name: z.string().trim().max(150),
    email,
    password: newPassword,
    password_confirm: z.string(),
  })
  .refine((values) => values.password === values.password_confirm, {
    path: ['password_confirm'],
    message: 'Les mots de passe ne correspondent pas.',
  });
export type RegisterValues = z.infer<typeof registerSchema>;

export const profileSchema = z.object({
  first_name: z.string().trim().max(150),
  last_name: z.string().trim().max(150),
  preferred_currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'Code ISO à 3 lettres (ex. XOF, EUR).'),
  timezone: z.string().trim().min(1, 'Le fuseau horaire est obligatoire (ex. Africa/Lome).'),
});
export type ProfileValues = z.infer<typeof profileSchema>;

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Le mot de passe actuel est obligatoire.'),
    new_password: newPassword,
    new_password_confirm: z.string(),
  })
  .refine((values) => values.new_password === values.new_password_confirm, {
    path: ['new_password_confirm'],
    message: 'Les mots de passe ne correspondent pas.',
  });
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
