import { StyleSheet } from 'react-native';

import { TaskCard } from '@/components/task/task-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { RankedTask } from '@/domain/priority';
import { elapsedMs } from '@/domain/time';
import type { Task, TaskAction } from '@/domain/types';

type CurrentTaskProps = {
  /** The IN_PROGRESS task, if any. */
  current?: Task;
  /** Best task to start when nothing is in progress. */
  suggestion?: RankedTask;
  now: number;
  onAction: (task: Task, action: TaskAction) => void;
};

export function CurrentTask({ current, suggestion, now, onAction }: CurrentTaskProps) {
  if (current) {
    return (
      <TaskCard
        task={current}
        now={now}
        elapsedMs={elapsedMs(current, now)}
        onAction={(action) => onAction(current, action)}
      />
    );
  }

  if (suggestion) {
    return (
      <TaskCard
        task={suggestion.task}
        now={now}
        reason={suggestion.reason}
        onAction={(action) => onAction(suggestion.task, action)}
      />
    );
  }

  return (
    <ThemedView type="backgroundElement" style={styles.empty}>
      <ThemedText themeColor="textSecondary">All clear. No tasks waiting.</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  empty: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    alignItems: 'center',
  },
});
