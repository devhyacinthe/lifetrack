import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Dialog,
  FAB,
  IconButton,
  List,
  Portal,
  Text,
  useTheme,
} from 'react-native-paper';

import { ApiError, errorMessage } from '@/api/errors';
import type { MetricType } from '@/api/types';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import { ListCard } from '@/components/list-card';
import { MetricTypeDialog } from '@/features/body/metric-type-dialog';
import { MetricTypeRow } from '@/features/body/metric-type-row';
import { useDeleteMetricType, useMetricTypes, useUpdateMetricType } from '@/features/body/queries';

type EditorState = { metricType?: MetricType } | null;

export default function MeasurementsScreen() {
  const { colors } = useTheme();
  const types = useMetricTypes();
  const updateType = useUpdateMetricType();
  const deleteType = useDeleteMetricType();

  const [editor, setEditor] = useState<EditorState>(null);
  const [selected, setSelected] = useState<MetricType | null>(null);
  const [toDelete, setToDelete] = useState<MetricType | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  /** Suppression refusée (409) : on propose la désactivation. */
  const [inUse, setInUse] = useState(false);

  const closeDelete = () => {
    setToDelete(null);
    setActionError(null);
    setInUse(false);
  };

  const setActive = async (metricType: MetricType, isActive: boolean) => {
    setActionError(null);
    try {
      await updateType.mutateAsync({ id: metricType.id, is_active: isActive });
      setSelected(null);
      closeDelete();
    } catch (error) {
      setActionError(errorMessage(error));
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setActionError(null);
    try {
      await deleteType.mutateAsync(toDelete.id);
      closeDelete();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) setInUse(true);
      setActionError(errorMessage(error));
    }
  };

  if (types.isPending) {
    return <ActivityIndicator style={styles.loader} accessibilityLabel="Chargement" />;
  }
  if (types.isError) {
    return (
      <EmptyState
        icon="wifi-alert"
        tone="error"
        title="Chargement impossible"
        message={errorMessage(types.error)}
        actionLabel="Réessayer"
        onAction={() => types.refetch()}
      />
    );
  }

  const active = types.data.filter((t) => t.is_active);
  const inactive = types.data.filter((t) => !t.is_active);
  const open = (t: MetricType) =>
    router.push({ pathname: '/measurements/[typeId]', params: { typeId: t.id } });

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <IconButton
              icon="plus"
              mode="contained-tonal"
              onPress={() => setEditor({})}
              accessibilityLabel="Nouveau type de mesure"
            />
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
          Facultatives : enregistrez seulement ce qui vous intéresse. Une valeur par mesure et par
          jour ; l’application ne modifie jamais vos valeurs.
        </Text>
        {active.length === 0 ? (
          <EmptyState
            icon="tape-measure"
            title="Aucune mesure active"
            message="Créez un type de mesure (poids, tour de taille…) pour commencer."
            actionLabel="Nouveau type de mesure"
            onAction={() => setEditor({})}
          />
        ) : (
          <ListCard title="Mes mesures">
            {active.map((t) => (
              <MetricTypeRow
                key={t.id}
                metricType={t}
                onPress={() => open(t)}
                onOptions={() => setSelected(t)}
              />
            ))}
          </ListCard>
        )}
        {inactive.length > 0 ? (
          <ListCard
            title="Désactivées"
            subtitle="Leur historique est conservé, mais elles ne sont plus proposées.">
            {inactive.map((t) => (
              <MetricTypeRow
                key={t.id}
                metricType={t}
                onPress={() => open(t)}
                onOptions={() => setSelected(t)}
              />
            ))}
          </ListCard>
        ) : null}
      </ScrollView>

      {active.length > 0 ? (
        <FAB
          icon="plus"
          label="Mesure"
          style={styles.fab}
          onPress={() => router.push('/measurements/new')}
          accessibilityLabel="Ajouter une mesure"
        />
      ) : null}

      <MetricTypeDialog
        visible={editor !== null}
        onDismiss={() => setEditor(null)}
        metricType={editor?.metricType}
      />

      <Portal>
        <Dialog visible={selected !== null} onDismiss={() => setSelected(null)}>
          <Dialog.Title>{selected?.name}</Dialog.Title>
          <Dialog.Content>
            <List.Item
              title="Modifier"
              left={(props) => <List.Icon {...props} icon="pencil-outline" />}
              onPress={() => {
                setEditor({ metricType: selected ?? undefined });
                setSelected(null);
              }}
            />
            <List.Item
              title={selected?.is_active ? 'Désactiver' : 'Réactiver'}
              description={
                selected?.is_active
                  ? 'Elle ne sera plus proposée pour les nouvelles valeurs'
                  : undefined
              }
              left={(props) => (
                <List.Icon
                  {...props}
                  icon={selected?.is_active ? 'eye-off-outline' : 'eye-outline'}
                />
              )}
              onPress={() => selected && setActive(selected, !selected.is_active)}
            />
            <List.Item
              title="Supprimer"
              titleStyle={{ color: colors.error }}
              left={(props) => <List.Icon {...props} icon="delete-outline" color={colors.error} />}
              onPress={() => {
                setToDelete(selected);
                setSelected(null);
              }}
            />
            {actionError && selected ? (
              <Text style={{ color: colors.error }}>{actionError}</Text>
            ) : null}
          </Dialog.Content>
        </Dialog>
      </Portal>

      <ConfirmDialog
        visible={toDelete !== null}
        title={`Supprimer « ${toDelete?.name ?? ''} » ?`}
        message="Une mesure qui a déjà des valeurs ne peut pas être supprimée : elle peut seulement être désactivée."
        confirmLabel="Supprimer"
        onConfirm={confirmDelete}
        onDismiss={closeDelete}
        loading={deleteType.isPending}
        error={actionError}
        alternative={
          inUse && toDelete?.is_active ? (
            <Button onPress={() => setActive(toDelete, false)} loading={updateType.isPending}>
              Désactiver
            </Button>
          ) : undefined
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 48 },
  content: { padding: 20, paddingBottom: 112, gap: 20 },
  fab: { position: 'absolute', right: 20, bottom: 28 },
});
