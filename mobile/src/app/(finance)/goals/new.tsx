import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { GoalForm } from '@/features/finance/goal-form';
import { useCreateGoal } from '@/features/finance/queries';

export default function NewGoalScreen() {
  const createGoal = useCreateGoal();

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <GoalForm
        submitLabel="Créer l’objectif"
        onSubmit={async (payload) => {
          await createGoal.mutateAsync(payload);
          router.back();
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
});
