import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';

import { TaskDraftFields } from '@/components/intake/task-draft-fields';
import { SheetLayout } from '@/components/sheet-layout';
import { ActionButton } from '@/components/task/action-button';
import { createAdhocTask } from '@/domain/intake';
import { useTaskDraft } from '@/hooks/use-task-draft';
import { useTaskStore } from '@/store/task-store';

/** "What's going on?": an associate reports an ad hoc task. Suggests type and priority; they decide. */
export default function IntakeScreen() {
  const associate = useTaskStore((s) => s.associate);
  const { addTask } = useTaskStore.getState();
  const draft = useTaskDraft(associate.location);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    const saved = await addTask(
      createAdhocTask({
        description: draft.description,
        type: draft.type,
        priority: draft.priority,
        location: draft.location,
      }),
    );
    setSaving(false);
    if (!saved) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <SheetLayout
      title="Report"
      footer={
        <ActionButton
          label={saving ? 'Adding…' : 'Add task'}
          disabled={!draft.isValid || saving}
          onPress={() => void submit()}
        />
      }>
      <TaskDraftFields draft={draft} placeholder="What's going on?" />
    </SheetLayout>
  );
}
