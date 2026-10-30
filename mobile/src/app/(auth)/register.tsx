import { Link } from 'expo-router';
import { Button } from 'react-native-paper';

import { ComingSoon } from '@/components/coming-soon';
import { Screen } from '@/components/screen';

export default function RegisterScreen() {
  return (
    <Screen title="Inscription">
      <ComingSoon
        icon="account-plus-outline"
        title="Création de compte"
        description="Le formulaire d'inscription sera relié à l'API LifeTracker."
        phase={6}
      />
      <Link href="/login" replace asChild>
        <Button mode="text">Déjà un compte ? Se connecter</Button>
      </Link>
    </Screen>
  );
}
