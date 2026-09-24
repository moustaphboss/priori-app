import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CurrentTask } from '@/components/now/current-task';
import { PauseStack } from '@/components/now/pause-stack';
import { SwitchPrompt } from '@/components/now/switch-prompt';
import { UpNextList } from '@/components/now/up-next-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { pickNext, rankTasks, scoreTask, shouldPreempt } from '@/domain/priority';
import type { Task, TaskAction } from '@/domain/types';
import { useNow } from '@/hooks/use-now';
import { selectCurrentTask, selectPauseStackIds, useTaskStore } from '@/store/task-store';

const UP_NEXT_COUNT = 4;

export default function NowScreen() {
  const now = useNow();
  const tasks = useTaskStore((s) => s.tasks);
  const associate = useTaskStore((s) => s.associate);
  const current = useTaskStore(selectCurrentTask);
  const pausedIds = useTaskStore(selectPauseStackIds);
  const { start, pause, resume, complete } = useTaskStore.getState();
  const [dismissedId, setDismissedId] = useState<string>();

  const paused = [...pausedIds]
    .reverse()
    .map((id) => tasks.find((t) => t.id === id))
    .filter((t): t is Task => t !== undefined);
  const ranked = rankTasks(tasks, associate, now);

  // Nothing in progress: offer the paused task to resume, or the top-ranked one.
  const suggestion = current
    ? undefined
    : pickNext(ranked, paused[0] && scoreTask(paused[0], associate, now));
  const upNext = ranked.filter((r) => r.task.id !== suggestion?.task.id).slice(0, UP_NEXT_COUNT);

  // Something in progress: prompt to switch only when the gap is large enough.
  const candidate = ranked[0];
  const showSwitch =
    current !== undefined &&
    candidate !== undefined &&
    candidate.task.id !== dismissedId &&
    shouldPreempt(scoreTask(current, associate, now), candidate);

  const handleAction = (task: Task, action: TaskAction) => {
    if (action === 'start') start(task.id);
    else if (action === 'pause') pause(task.id);
    else if (action === 'resume') resume(task.id);
    else complete(task.id);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title">Now</ThemedText>

          {showSwitch && (
            <SwitchPrompt
              candidate={candidate}
              onSwitch={() => start(candidate.task.id)}
              onDismiss={
                candidate.task.priority === 'P0' ? undefined : () => setDismissedId(candidate.task.id)
              }
            />
          )}

          <CurrentTask current={current} suggestion={suggestion} now={now} onAction={handleAction} />
          <PauseStack tasks={paused} now={now} onResume={(task) => resume(task.id)} />

          <ThemedText type="subtitle">Up next</ThemedText>
          <UpNextList ranked={upNext} now={now} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  content: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
});
