import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button, List } from 'react-native-paper';

import { ComingSoon } from '@/components/coming-soon';
import { Screen } from '@/components/screen';

export default function ProfileScreen() {
  return (
    <Screen title="Profil">
      <ComingSoon
        icon="account-cog-outline"
        title="Profil et préférences"
        description="Informations personnelles, devise, fuseau horaire, mot de passe et suppression du compte."
        phase={6}
      />
      <List.Item
        title="Thème"
        description="Clair ou sombre, selon le réglage du téléphone"
        left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
      />
      <View style={styles.actions}>
        <Link href="/login" asChild>
          <Button mode="contained">Aperçu de l’écran de connexion</Button>
        </Link>
        <Link href="/register" asChild>
          <Button mode="outlined">Aperçu de l’écran d’inscription</Button>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 8 },
});
