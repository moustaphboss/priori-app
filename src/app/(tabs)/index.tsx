import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { CurrentTask } from '@/components/now/current-task';
import { PauseStack } from '@/components/now/pause-stack';
import { SwitchPrompt } from '@/components/now/switch-prompt';
import { UpNextList } from '@/components/now/up-next-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  BottomTabInset,
  MaxContentWidth,
  PriorityColors,
  Spacing,
  TouchTarget,
} from '@/constants/theme';
import { pickNext, rankTasks, scoreTask, shouldPreempt } from '@/domain/priority';
import type { Task, TaskAction } from '@/domain/types';
import { useNow } from '@/hooks/use-now';
import { selectCurrentTask, selectPausedTasks, useTaskStore } from '@/store/task-store';

const UP_NEXT_COUNT = 4;

export default function NowScreen() {
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
          <View style={styles.header}>
            <ThemedText type="title">Now</ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Report something"
              onPress={() => router.push('/intake')}
              style={({ pressed }) => [styles.report, pressed && styles.pressed]}>
              <ThemedText style={styles.reportLabel}>+ Report</ThemedText>
            </Pressable>
          </View>
          <ThemedText type="small" themeColor="textSecondary" style={styles.signedIn}>
            {associate.name} · {associate.location}
          </ThemedText>

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
          <PauseStack tasks={paused} now={now} onResume={(task) => void resume(task.id)} />

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
  signedIn: {
    marginTop: -Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  report: {
    minHeight: TouchTarget,
    paddingHorizontal: Spacing.four,
    borderRadius: TouchTarget / 2,
    justifyContent: 'center',
    backgroundColor: PriorityColors.P2,
  },
  reportLabel: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 700,
  },
  pressed: {
    opacity: 0.7,
  },
  content: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
});
