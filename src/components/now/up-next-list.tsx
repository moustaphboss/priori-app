import { StyleSheet, View } from 'react-native';

import { TaskCard } from '@/components/task/task-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { RankedTask } from '@/domain/priority';

type UpNextListProps = {
  ranked: RankedTask[];
  now: number;
};

export function UpNextList({ ranked, now }: UpNextListProps) {
  if (ranked.length === 0) {
    return <ThemedText themeColor="textSecondary">Nothing else queued</ThemedText>;
  }

  return (
    <View style={styles.list}>
      {ranked.map(({ task, reason }) => (
        <TaskCard key={task.id} task={task} now={now} reason={reason} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.three,
  },
});
