import { StyleSheet, View } from 'react-native';

import { PriorityBadge } from '@/components/task/priority-badge';
import { TaskTypeIcon } from '@/components/task/task-type-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { formatDuration } from '@/domain/format';
import type { RankedTask } from '@/domain/priority';
import { elapsedMs } from '@/domain/time';
import type { Associate, Task } from '@/domain/types';

type TeamMemberCardProps = {
  associate: Associate;
  current?: Task;
  /** Their own ranked queue, best first. */
  queue: RankedTask[];
  pausedCount: number;
  now: number;
};

/** One associate as the manager sees them: what they're on now and what's next for them. */
export function TeamMemberCard({ associate, current, queue, pausedCount, now }: TeamMemberCardProps) {
  const location = current?.location ?? associate.location;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.header}>
        <ThemedText style={styles.name}>{associate.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {[location, pausedCount > 0 ? `${pausedCount} paused` : undefined]
            .filter(Boolean)
            .join(' · ')}
        </ThemedText>
      </View>

      {current ? (
        <View style={styles.row}>
          <TaskTypeIcon type={current.type} size={16} />
          <View style={styles.text}>
            <ThemedText type="smallBold" numberOfLines={1}>
              {current.title}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              In progress · {formatDuration(elapsedMs(current, now))}
            </ThemedText>
          </View>
          <PriorityBadge priority={current.priority} />
        </View>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          Free, nothing in progress
        </ThemedText>
      )}

      {queue.length > 0 && (
        <View style={styles.queue}>
          {queue.map(({ task, reason }, i) => (
            <ThemedText key={task.id} type="small" themeColor="textSecondary" numberOfLines={1}>
              {i + 1}. {task.priority} {task.title} · {reason}
            </ThemedText>
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
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  name: {
    fontSize: 18,
    fontWeight: 700,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  text: {
    flex: 1,
  },
  queue: {
    gap: Spacing.half,
  },
});
