import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { StyleSheet } from 'react-native';
import { Button, Dialog, Portal } from 'react-native-paper';

import type { Category, TransactionType } from '@/api/types';
import { FormMessage } from '@/components/form-message';
import { FormTextInput } from '@/components/form-text-input';
import { applyApiErrors } from '@/forms/api-errors';
import { type CategoryValues, categorySchema } from '@/schemas/finance';

import { useCreateCategory, useUpdateCategory } from './queries';

type CategoryDialogProps = {
  visible: boolean;
  onDismiss: () => void;
  /** Type des catégories créées. */
  type: TransactionType;
  /** Catégorie renommée ; absente pour une création. */
  category?: Category;
};

/** Création ou renommage d'une catégorie (le type n'est pas modifiable). */
export function CategoryDialog({ visible, onDismiss, type, category }: CategoryDialogProps) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        {/* Monté à chaque ouverture : le formulaire repart des bonnes valeurs. */}
        {visible ? (
          <CategoryDialogForm onDismiss={onDismiss} type={type} category={category} />
        ) : null}
      </Dialog>
    </Portal>
  );
}

function CategoryDialogForm({ onDismiss, type, category }: Omit<CategoryDialogProps, 'visible'>) {
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const [message, setMessage] = useState<string | null>(null);
  const { control, handleSubmit, setError, formState } = useForm<CategoryValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: category?.name ?? '', type: category?.type ?? type },
  });

  const submit = handleSubmit(async (values) => {
    setMessage(null);
    try {
      if (category) await updateCategory.mutateAsync({ id: category.id, name: values.name });
      else await createCategory.mutateAsync(values);
      onDismiss();
    } catch (error) {
      setMessage(applyApiErrors(error, setError, ['name']));
    }
  });

  const isIncome = (category?.type ?? type) === 'income';

  return (
    <>
      <Dialog.Title>
        {category
          ? 'Renommer la catégorie'
          : isIncome
            ? 'Nouvelle catégorie de revenus'
            : 'Nouvelle catégorie de dépenses'}
      </Dialog.Title>
      <Dialog.Content style={styles.content}>
        <FormTextInput
          control={control}
          name="name"
          label="Nom"
          icon="shape-outline"
          autoFocus
          maxLength={60}
          onSubmitEditing={() => submit()}
        />
        <FormMessage message={message} />
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={onDismiss}>Annuler</Button>
        <Button
          onPress={() => submit()}
          loading={formState.isSubmitting}
          disabled={formState.isSubmitting}>
          {category ? 'Renommer' : 'Créer'}
        </Button>
      </Dialog.Actions>
    </>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12 },
});
