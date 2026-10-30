import { Link } from 'expo-router';
import { Button } from 'react-native-paper';

import { ComingSoon } from '@/components/coming-soon';
import { Screen } from '@/components/screen';

export default function LoginScreen() {
  return (
    <Screen title="Connexion">
      <ComingSoon
        icon="login"
        title="Connexion par e-mail"
        description="Le formulaire de connexion sera relié à l'API LifeTracker."
        phase={6}
      />
      <Link href="/register" replace asChild>
        <Button mode="text">Pas encore de compte ? S’inscrire</Button>
      </Link>
    </Screen>
  );
}
