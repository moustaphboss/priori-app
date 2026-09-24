import { StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/task/action-button';
import { PriorityBadge } from '@/components/task/priority-badge';
import { TaskTypeIcon } from '@/components/task/task-type-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PriorityColors, Spacing } from '@/constants/theme';
import { formatDue, formatDuration, isOverdue } from '@/domain/format';
import { availableActions } from '@/domain/task-actions';
import type { Task, TaskAction } from '@/domain/types';

const ACTION_LABELS: Record<TaskAction, string> = {
  start: 'Start',
  pause: 'Pause',
  resume: 'Resume',
  complete: 'Complete',
};

export type TaskCardProps = {
  task: Task;
  /** Epoch ms, passed in so the card stays pure and easy to render in isolation. */
  now: number;
  /** Why the task is ranked where it is, e.g. "P0 — safety". */
  reason?: string;
  /** Time worked so far. Pass it to show a running timer. */
  elapsedMs?: number;
  /** Omit to render the card without action buttons. */
  onAction?: (action: TaskAction) => void;
};

export function TaskCard({ task, now, reason, elapsedMs, onAction }: TaskCardProps) {
  const due = formatDue(task.dueAt, now);
  const meta = [task.location, due].filter(Boolean).join(' · ');
  const actions = onAction ? availableActions(task.state) : [];

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.header}>
        <TaskTypeIcon type={task.type} />
        <View style={styles.text}>
          <ThemedText type="default" style={styles.title}>
            {task.title}
          </ThemedText>
          {meta !== '' && (
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={isOverdue(task.dueAt, now) && { color: PriorityColors.P0 }}>
              {meta}
            </ThemedText>
          )}
          {reason && reason !== due && <ThemedText type="smallBold">{reason}</ThemedText>}
        </View>
        <PriorityBadge priority={task.priority} />
      </View>

      {elapsedMs !== undefined && (
        <View style={styles.timer} accessibilityLabel={`Worked ${formatDuration(elapsedMs)}`}>
          <ThemedText style={styles.timerValue}>{formatDuration(elapsedMs)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            of {task.estimatedMinutes} min est.
          </ThemedText>
        </View>
      )}

      {actions.length > 0 && (
        <View style={styles.actions}>
          {actions.map((action, i) => (
            <ActionButton
              key={action}
              label={ACTION_LABELS[action]}
              tone={i === 0 ? 'primary' : 'secondary'}
              onPress={() => onAction?.(action)}
            />
          ))}
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
  },
  timer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
  },
  timerValue: {
    fontSize: 40,
    lineHeight: 48,
    fontWeight: 600,
    fontVariant: ['tabular-nums'],
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
