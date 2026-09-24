import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CurrentTask } from '@/components/now/current-task';
import { UpNextList } from '@/components/now/up-next-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { rankTasks } from '@/domain/priority';
import type { Task, TaskAction } from '@/domain/types';
import { useNow } from '@/hooks/use-now';
import { selectCurrentTask, useTaskStore } from '@/store/task-store';

const UP_NEXT_COUNT = 4;

export default function NowScreen() {
  const now = useNow();
  const tasks = useTaskStore((s) => s.tasks);
  const associate = useTaskStore((s) => s.associate);
  const current = useTaskStore(selectCurrentTask);
  const start = useTaskStore((s) => s.start);
  const complete = useTaskStore((s) => s.complete);

  const ranked = rankTasks(tasks, associate, now);
  // With nothing in progress, the top-ranked task is offered in the "Now" slot instead.
  const suggestion = current ? undefined : ranked[0];
  const upNext = ranked.slice(suggestion ? 1 : 0, (suggestion ? 1 : 0) + UP_NEXT_COUNT);

  const handleAction = (task: Task, action: TaskAction) => {
    if (action === 'start') start(task.id);
    else if (action === 'complete') complete(task.id);
    else console.log(`[task] ${action} ${task.id} — not wired up yet`);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title">Now</ThemedText>
          <CurrentTask current={current} suggestion={suggestion} now={now} onAction={handleAction} />

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
