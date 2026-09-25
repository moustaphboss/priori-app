import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { CurrentTask } from '@/components/now/current-task';
import { PauseStack } from '@/components/now/pause-stack';
import { SwitchPrompt } from '@/components/now/switch-prompt';
import { UpNextList } from '@/components/now/up-next-list';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { pickNext, rankTasks, scoreTask, shouldPreempt } from '@/domain/priority';
import type { Task, TaskAction } from '@/domain/types';
import { useNow } from '@/hooks/use-now';
import { selectCurrentTask, selectPausedTasks, useTaskStore } from '@/store/task-store';

const UP_NEXT_COUNT = 4;

/** Associate's home: current task, pause stack and ranked up-next list. */
export function NowView() {
  const now = useNow();
  const tasks = useTaskStore((s) => s.tasks);
  const associate = useTaskStore((s) => s.associate);
  const current = useTaskStore(selectCurrentTask);
  const { start, pause, resume, complete } = useTaskStore.getState();
  const [dismissedId, setDismissedId] = useState<string>();

  const paused = useTaskStore(useShallow(selectPausedTasks));
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
    if (action === 'start') void start(task.id);
    else if (action === 'pause') void pause(task.id);
    else if (action === 'resume') void resume(task.id);
    else void complete(task.id);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ScreenHeader
            title="Now"
            action={{
              label: '+ Report',
              accessibilityLabel: 'Report something',
              onPress: () => router.push('/intake'),
            }}
          />

          {showSwitch && (
            <SwitchPrompt
              candidate={candidate}
              onSwitch={() => void start(candidate.task.id)}
              onDismiss={
                candidate.task.priority === 'P0' ? undefined : () => setDismissedId(candidate.task.id)
              }
            />
          )}

          <CurrentTask current={current} suggestion={suggestion} now={now} onAction={handleAction} />
          {/* The suggested task is already shown above, so leave it out of the stack. */}
          <PauseStack
            tasks={paused.filter((t) => t.id !== suggestion?.task.id)}
            now={now}
            onResume={(task) => void resume(task.id)}
          />

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
