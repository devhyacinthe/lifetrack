import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';

import { ApiError, errorMessage } from '@/api/errors';

import { EmptyState } from './empty-state';

type QueryLike = {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => unknown;
};

type QueryStatusProps = {
  query: QueryLike;
  /** Titre affiché quand l'objet n'existe pas ou plus (404). */
  notFoundTitle: string;
};

/**
 * État d'un écran de détail tant que ses données ne sont pas disponibles : chargement,
 * objet introuvable (404, ex. supprimé depuis un autre appareil) ou erreur réseau.
 */
export function QueryStatus({ query, notFoundTitle }: QueryStatusProps) {
  if (query.isPending) {
    return <ActivityIndicator style={styles.loader} accessibilityLabel="Chargement" />;
  }
  const notFound = query.error instanceof ApiError && query.error.status === 404;
  return (
    <EmptyState
      icon={notFound ? 'file-question-outline' : 'wifi-alert'}
      tone="error"
      title={notFound ? notFoundTitle : 'Chargement impossible'}
      message={notFound ? 'Il a peut-être été supprimé.' : errorMessage(query.error)}
      actionLabel={notFound ? 'Retour' : 'Réessayer'}
      onAction={() => (notFound ? router.back() : query.refetch())}
    />
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 48 },
});
