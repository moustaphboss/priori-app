import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { TaskDraftFields } from '@/components/intake/task-draft-fields';
import { type AssigneeChoice, AssigneePicker } from '@/components/manager/assignee-picker';
import { SheetLayout } from '@/components/sheet-layout';
import { ActionButton } from '@/components/task/action-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { describeTeam, recommendAssignees } from '@/domain/dispatch';
import { createAdhocTask } from '@/domain/intake';
import { useTaskDraft } from '@/hooks/use-task-draft';
import { useTaskStore } from '@/store/task-store';

/** Manager creates a task and sends it to the recommended (or chosen) associate. */
export default function DispatchScreen() {
  const associates = useTaskStore((s) => s.associates);
  const tasks = useTaskStore((s) => s.tasks);
  const { addTask } = useTaskStore.getState();
  // Pre-filled when coming from the assistant ("Edit details").
  const { text } = useLocalSearchParams<{ text?: string }>();
  const draft = useTaskDraft('', text);
  // Undefined until the manager picks: follows the top recommendation.
  const [choice, setChoice] = useState<AssigneeChoice>();
  const [saving, setSaving] = useState(false);

  // Only rank people once we know what the task is; otherwise the "best" pick would be noise.
  const options = draft.isUnderstood
    ? recommendAssignees(
        { type: draft.type, priority: draft.priority, location: draft.location },
        associates,
        tasks,
      )
    : describeTeam(associates, tasks);
  const assigneeId =
    choice !== undefined ? choice : draft.isUnderstood ? options[0]?.associate.id : null;
  const assigneeName = associates.find((a) => a.id === assigneeId)?.name;

  const submit = async () => {
    setSaving(true);
    const saved = await addTask(
      createAdhocTask({
        description: draft.description,
        title: draft.title,
        type: draft.type,
        priority: draft.priority,
        location: draft.location,
        assigneeId: assigneeId ?? undefined,
      }),
    );
    setSaving(false);
    if (!saved) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <SheetLayout
      title="Dispatch"
      footer={
        <ActionButton
          label={
            saving
              ? 'Sending…'
              : !draft.isValid
                ? 'Send'
                : assigneeName
                  ? `Send to ${assigneeName}`
                  : 'Post to everyone'
          }
          disabled={!draft.isValid || saving}
          onPress={() => void submit()}
        />
      }>
      <TaskDraftFields draft={draft} placeholder="What needs doing?" />
      <View style={{ gap: Spacing.two }}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          ASSIGN TO
        </ThemedText>
        {!draft.isUnderstood && (
          <ThemedText type="small" themeColor="textSecondary">
            Describe the task or pick a type to get a recommendation.
          </ThemedText>
        )}
        <AssigneePicker
          recommendations={options}
          value={assigneeId ?? null}
          onChange={setChoice}
          allowOpen
          ranked={draft.isUnderstood}
        />
      </View>
    </SheetLayout>
  );
}
