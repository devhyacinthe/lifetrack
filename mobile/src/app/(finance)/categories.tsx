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
  SegmentedButtons,
  Surface,
  Text,
  TouchableRipple,
  useTheme,
} from 'react-native-paper';

import { ApiError, errorMessage } from '@/api/errors';
import type { Category, TransactionType } from '@/api/types';
import { EmptyState } from '@/components/empty-state';
import { IconBadge } from '@/components/icon-badge';
import { CategoryDialog } from '@/features/finance/category-dialog';
import { categoryIcon } from '@/features/finance/labels';
import { useCategories, useDeleteCategory, useUpdateCategory } from '@/features/finance/queries';

type EditorState = { category?: Category } | null;

export default function CategoriesScreen() {
  const { colors } = useTheme();
  const categories = useCategories();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [type, setType] = useState<TransactionType>('expense');
  const [editor, setEditor] = useState<EditorState>(null);
  const [selected, setSelected] = useState<Category | null>(null);
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  /** Vrai quand la suppression a été refusée (409) : on propose la désactivation. */
  const [inUse, setInUse] = useState(false);

  const closeDelete = () => {
    setToDelete(null);
    setActionError(null);
    setInUse(false);
  };

  const setActive = async (category: Category, isActive: boolean) => {
    setActionError(null);
    try {
      await updateCategory.mutateAsync({ id: category.id, is_active: isActive });
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
      await deleteCategory.mutateAsync(toDelete.id);
      closeDelete();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) setInUse(true);
      setActionError(errorMessage(error));
    }
  };

  const header = (
    <Stack.Screen
      options={{
        headerRight: () => (
          <IconButton
            icon="plus"
            mode="contained-tonal"
            onPress={() => setEditor({})}
            accessibilityLabel="Nouvelle catégorie"
          />
        ),
      }}
    />
  );

  if (categories.isPending) {
    return <ActivityIndicator style={styles.loader} accessibilityLabel="Chargement" />;
  }
  if (categories.isError) {
    return (
      <EmptyState
        icon="wifi-alert"
        tone="error"
        title="Chargement impossible"
        message={errorMessage(categories.error)}
        actionLabel="Réessayer"
        onAction={() => categories.refetch()}
      />
    );
  }
  // (le bouton « + » de l'en-tête n'est ajouté qu'une fois les catégories chargées)

  const ofType = categories.data.filter((c) => c.type === type);
  const active = ofType.filter((c) => c.is_active);
  const inactive = ofType.filter((c) => !c.is_active);

  const renderGroup = (items: Category[]) => (
    <Surface
      elevation={0}
      style={[
        styles.group,
        { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
      ]}>
      {items.map((category, index) => (
        <TouchableRipple
          key={category.id}
          onPress={() => setSelected(category)}
          accessibilityRole="button"
          accessibilityLabel={`${category.name}${category.is_active ? '' : ', désactivée'}. Options`}>
          <View
            style={[
              styles.row,
              index > 0 && {
                borderTopColor: colors.outlineVariant,
                borderTopWidth: StyleSheet.hairlineWidth,
              },
              !category.is_active && styles.inactive,
            ]}>
            <IconBadge
              icon={categoryIcon(category.name, category.type)}
              tone={category.type === 'income' ? 'primary' : 'secondary'}
              size={40}
            />
            <Text variant="bodyLarge" style={styles.name} numberOfLines={1}>
              {category.name}
            </Text>
            <Icon source="dots-horizontal" size={20} color={colors.onSurfaceVariant} />
          </View>
        </TouchableRipple>
      ))}
    </Surface>
  );

  return (
    <>
      {header}
      <ScrollView contentContainerStyle={styles.content}>
        <SegmentedButtons
          value={type}
          onValueChange={(value) => setType(value as TransactionType)}
          buttons={[
            { value: 'expense', label: 'Dépenses', icon: 'arrow-top-right' },
            { value: 'income', label: 'Revenus', icon: 'arrow-bottom-left' },
          ]}
        />

        {active.length === 0 ? (
          <EmptyState
            icon="shape-outline"
            title="Aucune catégorie active"
            message="Créez une catégorie pour classer vos opérations."
            actionLabel="Nouvelle catégorie"
            onAction={() => setEditor({})}
          />
        ) : (
          renderGroup(active)
        )}

        {inactive.length > 0 ? (
          <View style={styles.section}>
            <Text variant="titleSmall" style={{ color: colors.onSurfaceVariant }}>
              Désactivées
            </Text>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
              Elles restent visibles dans l’historique, mais ne sont plus proposées.
            </Text>
            {renderGroup(inactive)}
          </View>
        ) : null}
      </ScrollView>

      <CategoryDialog
        visible={editor !== null}
        onDismiss={() => setEditor(null)}
        type={type}
        category={editor?.category}
      />

      <Portal>
        {/* Options d'une catégorie */}
        <Dialog visible={selected !== null} onDismiss={() => setSelected(null)}>
          <Dialog.Title>{selected?.name}</Dialog.Title>
          <Dialog.Content>
            <List.Item
              title="Renommer"
              left={(props) => <List.Icon {...props} icon="pencil-outline" />}
              onPress={() => {
                setEditor({ category: selected ?? undefined });
                setSelected(null);
              }}
            />
            <List.Item
              title={selected?.is_active ? 'Désactiver' : 'Réactiver'}
              description={
                selected?.is_active
                  ? 'Elle ne sera plus proposée pour les nouvelles opérations'
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

        {/* Confirmation de suppression (409 si la catégorie est utilisée) */}
        <Dialog visible={toDelete !== null} onDismiss={closeDelete}>
          <Dialog.Title>Supprimer « {toDelete?.name} » ?</Dialog.Title>
          <Dialog.Content style={styles.dialog}>
            <Text variant="bodyMedium">
              Une catégorie utilisée par des transactions ne peut pas être supprimée : elle peut
              seulement être désactivée.
            </Text>
            {actionError ? <Text style={{ color: colors.error }}>{actionError}</Text> : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeDelete}>Annuler</Button>
            {inUse && toDelete?.is_active ? (
              <Button onPress={() => setActive(toDelete, false)} loading={updateCategory.isPending}>
                Désactiver
              </Button>
            ) : (
              <Button
                textColor={colors.error}
                onPress={confirmDelete}
                loading={deleteCategory.isPending}
                disabled={deleteCategory.isPending || inUse}>
                Supprimer
              </Button>
            )}
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 48 },
  content: { padding: 20, paddingBottom: 40, gap: 16 },
  group: { borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  name: { flex: 1 },
  inactive: { opacity: 0.6 },
  section: { gap: 8 },
  dialog: { gap: 8 },
});
