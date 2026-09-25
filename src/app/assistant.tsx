import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AssistantOrb } from '@/components/assistant/assistant-orb';
import { SheetLayout } from '@/components/sheet-layout';
import { ActionButton } from '@/components/task/action-button';
import { PriorityBadge } from '@/components/task/priority-badge';
import { TaskTypeIcon } from '@/components/task/task-type-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { recommendAssignees } from '@/domain/dispatch';
import { createAdhocTask, titleFromDescription } from '@/domain/intake';
import { useTaskDraft } from '@/hooks/use-task-draft';
import { useTheme } from '@/hooks/use-theme';
import { useTaskStore } from '@/store/task-store';

/**
 * Voice-first way to create a task: speak with the keyboard's dictation mic, the AI turns it
 * into a structured task, and one tap confirms. Associates report; the manager dispatches.
 */
export default function AssistantScreen() {
  const theme = useTheme();
  const isManager = useTaskStore((s) => s.role === 'manager');
  const associate = useTaskStore((s) => s.associate);
  const associates = useTaskStore((s) => s.associates);
  const tasks = useTaskStore((s) => s.tasks);
  const { addTask } = useTaskStore.getState();
  const draft = useTaskDraft(isManager ? '' : associate.location);
  const [saving, setSaving] = useState(false);

  // Manager: send to the top recommendation once we know what the task is; otherwise post it open.
  const assignee =
    isManager && draft.isUnderstood
      ? recommendAssignees(
          { type: draft.type, priority: draft.priority, location: draft.location },
          associates,
          tasks,
        )[0]
      : undefined;

  const listening = draft.description.trim() === '';
  const thinking = draft.aiStatus === 'thinking';
  const title = draft.title ?? titleFromDescription(draft.description);

  const submit = async () => {
    setSaving(true);
    const saved = await addTask(
      createAdhocTask({
        description: draft.description,
        title: draft.title,
        type: draft.type,
        priority: draft.priority,
        location: draft.location,
        assigneeId: assignee?.associate.id,
      }),
    );
    setSaving(false);
    if (!saved) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const editDetails = () =>
    router.replace({
      pathname: isManager ? '/dispatch' : '/intake',
      params: { text: draft.description },
    });

  const confirmLabel = saving
    ? 'Sending…'
    : isManager
      ? assignee
        ? `Send to ${assignee.associate.name}`
        : 'Post to everyone'
      : 'Create task';

  return (
    <SheetLayout
      title="Assistant"
      footer={
        <ActionButton
          label={confirmLabel}
          disabled={!draft.isValid || saving}
          onPress={() => void submit()}
        />
      }>
      <View style={styles.hero}>
        <AssistantOrb size={112} active={listening || thinking} />
        <ThemedText themeColor="textSecondary" style={styles.status}>
          {listening
            ? isManager
              ? 'What needs doing, and where?'
              : "What's going on?"
            : thinking
              ? 'Understanding…'
              : draft.aiStatus === 'failed'
                ? 'AI unavailable, using rules'
                : ' '}
        </ThemedText>
        {listening && (
          <View style={styles.hint}>
            <SymbolView
              name={{ ios: 'mic.fill', android: 'mic', web: 'mic' }}
              size={16}
              tintColor={theme.textSecondary}
            />
            <ThemedText type="small" themeColor="textSecondary">
              Tap the microphone on the keyboard and speak
            </ThemedText>
          </View>
        )}
      </View>

      <TextInput
        autoFocus
        multiline
        value={draft.description}
        onChangeText={draft.setDescription}
        placeholder="Or type it here"
        placeholderTextColor={theme.textSecondary}
        style={[styles.transcript, { color: theme.text }]}
        accessibilityLabel="Describe the task"
      />

      {draft.isValid && (
        <ThemedView type="backgroundElement" style={styles.preview}>
          <View style={styles.previewHeader}>
            <TaskTypeIcon type={draft.type} />
            <View style={styles.previewText}>
              <ThemedText style={styles.previewTitle}>{title}</ThemedText>
              {draft.location !== '' && (
                <ThemedText type="small" themeColor="textSecondary">
                  {draft.location}
                </ThemedText>
              )}
            </View>
            <PriorityBadge priority={draft.priority} />
          </View>
          {draft.suggestion && (
            <ThemedText type="small" themeColor="textSecondary">
              {draft.suggestion.source === 'ai' ? 'AI' : 'Rules'} · {draft.suggestion.reason}
            </ThemedText>
          )}
          {isManager && (
            <ThemedText type="smallBold">
              {assignee
                ? `→ ${assignee.associate.name}: ${assignee.reasons.join(' · ')}`
                : '→ Everyone (no clear match yet)'}
            </ThemedText>
          )}
          <Pressable
            accessibilityRole="button"
            onPress={editDetails}
            hitSlop={Spacing.two}
            style={({ pressed }) => [styles.edit, pressed && styles.pressed]}>
            <ThemedText type="smallBold" style={styles.editLabel}>
              Edit details
            </ThemedText>
          </Pressable>
        </ThemedView>
      )}
    </SheetLayout>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.two,
  },
  status: {
    fontSize: 20,
    fontWeight: 600,
    textAlign: 'center',
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: -Spacing.two,
  },
  transcript: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: 500,
    minHeight: 64,
    textAlign: 'center',
    textAlignVertical: 'top',
  },
  preview: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  previewText: {
    flex: 1,
    gap: Spacing.half,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: 600,
  },
  edit: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
  },
  editLabel: {
    color: '#1F6FEB',
  },
  pressed: {
    opacity: 0.6,
  },
});
