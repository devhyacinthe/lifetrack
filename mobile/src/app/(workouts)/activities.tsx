import { Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Dialog,
  Icon,
  IconButton,
  List,
  Portal,
  Text,
  TouchableRipple,
  useTheme,
} from 'react-native-paper';

import { ApiError, errorMessage } from '@/api/errors';
import type { ActivityType } from '@/api/types';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import { IconBadge } from '@/components/icon-badge';
import { ListCard } from '@/components/list-card';
import { ActivityDialog } from '@/features/workouts/activity-dialog';
import { activityIcon } from '@/features/workouts/labels';
import { useActivities, useDeleteActivity, useUpdateActivity } from '@/features/workouts/queries';

type EditorState = { activity?: ActivityType } | null;

function ActivityRow({ activity, onPress }: { activity: ActivityType; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <TouchableRipple
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${activity.name}${activity.is_active ? '' : ', désactivée'}. Options`}>
      <View style={[styles.row, !activity.is_active && styles.inactive]}>
        <IconBadge icon={activityIcon(activity.name)} tone="tertiary" size={40} />
        <View style={styles.rowText}>
          <Text variant="bodyLarge" numberOfLines={1}>
            {activity.name}
          </Text>
          {activity.tracks_distance ? (
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
              Distance mesurée
            </Text>
          ) : null}
        </View>
        <Icon source="dots-horizontal" size={20} color={colors.onSurfaceVariant} />
      </View>
    </TouchableRipple>
  );
}

export default function ActivitiesScreen() {
  const { colors } = useTheme();
  const activities = useActivities();
  const updateActivity = useUpdateActivity();
  const deleteActivity = useDeleteActivity();

  const [editor, setEditor] = useState<EditorState>(null);
  const [selected, setSelected] = useState<ActivityType | null>(null);
  const [toDelete, setToDelete] = useState<ActivityType | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  /** Suppression refusée (409) : on propose la désactivation. */
  const [inUse, setInUse] = useState(false);

  const closeDelete = () => {
    setToDelete(null);
    setActionError(null);
    setInUse(false);
  };

  const setActive = async (activity: ActivityType, isActive: boolean) => {
    setActionError(null);
    try {
      await updateActivity.mutateAsync({ id: activity.id, is_active: isActive });
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
      await deleteActivity.mutateAsync(toDelete.id);
      closeDelete();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) setInUse(true);
      setActionError(errorMessage(error));
    }
  };

  if (activities.isPending) {
    return <ActivityIndicator style={styles.loader} accessibilityLabel="Chargement" />;
  }
  if (activities.isError) {
    return (
      <EmptyState
        icon="wifi-alert"
        tone="error"
        title="Chargement impossible"
        message={errorMessage(activities.error)}
        actionLabel="Réessayer"
        onAction={() => activities.refetch()}
      />
    );
  }

  const active = activities.data.filter((a) => a.is_active);
  const inactive = activities.data.filter((a) => !a.is_active);

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <IconButton
              icon="plus"
              mode="contained-tonal"
              onPress={() => setEditor({})}
              accessibilityLabel="Nouvelle activité"
            />
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {active.length === 0 ? (
          <EmptyState
            icon="run"
            title="Aucune activité active"
            message="Créez une activité pour enregistrer vos séances."
            actionLabel="Nouvelle activité"
            onAction={() => setEditor({})}
          />
        ) : (
          <ListCard title="Actives">
            {active.map((a) => (
              <ActivityRow key={a.id} activity={a} onPress={() => setSelected(a)} />
            ))}
          </ListCard>
        )}
        {inactive.length > 0 ? (
          <ListCard
            title="Désactivées"
            subtitle="Elles restent visibles dans l’historique, mais ne sont plus proposées.">
            {inactive.map((a) => (
              <ActivityRow key={a.id} activity={a} onPress={() => setSelected(a)} />
            ))}
          </ListCard>
        ) : null}
      </ScrollView>

      <ActivityDialog
        visible={editor !== null}
        onDismiss={() => setEditor(null)}
        activity={editor?.activity}
      />

      <Portal>
        <Dialog visible={selected !== null} onDismiss={() => setSelected(null)}>
          <Dialog.Title>{selected?.name}</Dialog.Title>
          <Dialog.Content>
            <List.Item
              title="Modifier"
              left={(props) => <List.Icon {...props} icon="pencil-outline" />}
              onPress={() => {
                setEditor({ activity: selected ?? undefined });
                setSelected(null);
              }}
            />
            <List.Item
              title={selected?.is_active ? 'Désactiver' : 'Réactiver'}
              description={
                selected?.is_active
                  ? 'Elle ne sera plus proposée pour les nouvelles séances'
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
        message="Une activité utilisée par des séances ou un objectif ne peut pas être supprimée : elle peut seulement être désactivée."
        confirmLabel="Supprimer"
        onConfirm={confirmDelete}
        onDismiss={closeDelete}
        loading={deleteActivity.isPending}
        error={actionError}
        alternative={
          inUse && toDelete?.is_active ? (
            <Button onPress={() => setActive(toDelete, false)} loading={updateActivity.isPending}>
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
  content: { padding: 20, paddingBottom: 40, gap: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowText: { flex: 1, gap: 2 },
  inactive: { opacity: 0.6 },
});
