import { Redirect } from 'expo-router';

import { useAuth } from '@/auth/auth-context';

/**
 * Adresse sans écran accessible. C'est le cas à l'ouverture de l'application installée
 * (`lifetracker:///`) quand personne n'est connecté : l'accueil est réservé aux utilisateurs
 * connectés. On renvoie vers la connexion, ou vers l'accueil si une session existe.
 */
export default function NotFoundScreen() {
  const { status } = useAuth();
  return <Redirect href={status === 'signedIn' ? '/' : '/login'} />;
}
