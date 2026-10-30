import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Avatar, Button, Text, useTheme } from 'react-native-paper';

import { errorMessage } from '@/api/errors';
import type { User } from '@/api/types';
import { useAuth } from '@/auth/auth-context';
import { FormMessage } from '@/components/form-message';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { ChangePasswordForm } from '@/features/profile/change-password-form';
import { DeleteAccount } from '@/features/profile/delete-account';
import { ProfileForm } from '@/features/profile/profile-form';
import { useMe } from '@/features/profile/queries';

function initials(user: User) {
  const fromName = [user.first_name, user.last_name]
    .map((part) => part.trim().charAt(0))
    .join('')
    .toUpperCase();
  return fromName || user.email.charAt(0).toUpperCase();
}

function ProfileHeader({ user }: { user: User }) {
  const { colors, dark } = useTheme();
  const heroColor = dark ? colors.primaryContainer : colors.primary;
  const onHero = dark ? colors.onPrimaryContainer : colors.onPrimary;
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
  const memberSince = new Date(user.date_joined).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <View style={[styles.hero, { backgroundColor: heroColor }]}>
      <View style={[styles.blob, { backgroundColor: onHero }]} />
      <Avatar.Text
        size={64}
        label={initials(user)}
        style={{ backgroundColor: colors.tertiaryContainer }}
        color={colors.onTertiaryContainer}
      />
      <View style={styles.heroText}>
        <Text variant="titleLarge" numberOfLines={1} style={{ color: onHero }}>
          {fullName || 'Mon compte'}
        </Text>
        <Text variant="bodyMedium" numberOfLines={1} style={[styles.dim, { color: onHero }]}>
          {user.email}
        </Text>
        <View style={styles.pills}>
          {[user.preferred_currency, user.timezone, `Depuis ${memberSince}`].map((label) => (
            <View key={label} style={[styles.pill, { borderColor: onHero }]}>
              <Text variant="labelSmall" style={{ color: onHero }}>
                {label}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const me = useMe();
  const [signingOut, setSigningOut] = useState(false);

  const onSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  if (me.isPending) {
    return (
      <Screen title="Profil">
        <ActivityIndicator accessibilityLabel="Chargement du profil" style={styles.loader} />
      </Screen>
    );
  }

  if (me.isError) {
    return (
      <Screen title="Profil">
        <FormMessage message={errorMessage(me.error)} />
        <Button mode="contained" onPress={() => me.refetch()} loading={me.isFetching}>
          Réessayer
        </Button>
      </Screen>
    );
  }

  const user = me.data;

  return (
    <Screen title="Profil">
      <ProfileHeader user={user} />

      <SectionCard
        icon="account-edit-outline"
        title="Informations personnelles"
        description="Nom, devise et fuseau horaire utilisés dans l'application.">
        <ProfileForm user={user} />
      </SectionCard>

      <SectionCard
        icon="shield-lock-outline"
        title="Sécurité"
        description="Changer de mot de passe déconnecte vos autres appareils."
        tone="tertiary">
        <ChangePasswordForm email={user.email} />
      </SectionCard>

      <SectionCard
        icon="theme-light-dark"
        title="Apparence"
        description="Thème clair ou sombre, selon le réglage du téléphone."
        tone="secondary"
      />

      <SectionCard
        icon="logout"
        title="Session"
        description="Déconnexion de cet appareil ou suppression définitive du compte."
        tone="error">
        <Button mode="contained-tonal" icon="logout" onPress={onSignOut} loading={signingOut}>
          Se déconnecter
        </Button>
        <DeleteAccount />
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 32 },
  hero: {
    borderRadius: 28,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    right: -60,
    top: -90,
    opacity: 0.08,
  },
  heroText: { flex: 1, gap: 2 },
  dim: { opacity: 0.85 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  pill: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
});
