import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { type AssigneeChoice, AssigneePicker } from '@/components/manager/assignee-picker';
import { SheetLayout } from '@/components/sheet-layout';
import { ActionButton } from '@/components/task/action-button';
import { TaskCard } from '@/components/task/task-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { recommendAssignees } from '@/domain/dispatch';
import { useNow } from '@/hooks/use-now';
import { useTaskStore } from '@/store/task-store';

/** Manager hands an open or escalated task to someone. */
export default function AssignScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const now = useNow();
  const task = useTaskStore((s) => s.tasks.find((t) => t.id === id));
  const associates = useTaskStore((s) => s.associates);
  const tasks = useTaskStore((s) => s.tasks);
  const { assign } = useTaskStore.getState();
  const [choice, setChoice] = useState<AssigneeChoice>();
  const [saving, setSaving] = useState(false);

  if (!task) {
    return (
      <SheetLayout title="Assign" footer={null}>
        <ThemedText themeColor="textSecondary">This task no longer exists.</ThemedText>
      </SheetLayout>
    );
  }

  // Don't recommend the person it's already with.
  const recommendations = recommendAssignees(task, associates, tasks).filter(
    (r) => r.associate.id !== task.assigneeId,
  );
  const assigneeId = choice ?? recommendations[0]?.associate.id;
  const assigneeName = associates.find((a) => a.id === assigneeId)?.name;

  const submit = async () => {
    if (!assigneeId) return;
    setSaving(true);
    const saved = await assign(task.id, assigneeId);
    setSaving(false);
    if (!saved) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <SheetLayout
      title="Assign"
      footer={
        <ActionButton
          label={saving ? 'Assigning…' : `Assign to ${assigneeName ?? '…'}`}
          disabled={!assigneeId || saving}
          onPress={() => void submit()}
        />
      }>
      <TaskCard task={task} now={now} />
      <View style={{ gap: Spacing.two }}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          ASSIGN TO
        </ThemedText>
        <AssigneePicker
          recommendations={recommendations}
          value={assigneeId ?? null}
          onChange={setChoice}
        />
      </View>
    </SheetLayout>
  );
}
