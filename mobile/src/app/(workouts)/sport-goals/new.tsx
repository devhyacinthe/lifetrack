import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { useCreateWorkoutGoal } from '@/features/workouts/queries';
import { WorkoutGoalForm } from '@/features/workouts/workout-goal-form';

export default function NewWorkoutGoalScreen() {
  const createGoal = useCreateWorkoutGoal();

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <WorkoutGoalForm
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
