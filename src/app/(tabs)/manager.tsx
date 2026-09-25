import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TeamMemberCard } from '@/components/manager/team-member-card';
import { TaskCard } from '@/components/task/task-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  BottomTabInset,
  MaxContentWidth,
  PriorityColors,
  Spacing,
  TouchTarget,
} from '@/constants/theme';
import { formatDuration } from '@/domain/format';
import { rankTasks } from '@/domain/priority';
import { ackRemainingMs, awaitingAck } from '@/domain/safety';
import type { Task } from '@/domain/types';
import { useNow } from '@/hooks/use-now';
import { useTaskStore } from '@/store/task-store';

const QUEUE_PREVIEW = 2;

/** Why a task needs the manager, or undefined if it doesn't. */
function attentionReason(task: Task, now: number): string | undefined {
  if (task.state === 'ESCALATED') return 'Escalated: nobody acknowledged';
  if (awaitingAck(task)) return `Waiting for acknowledgement · ${formatDuration(ackRemainingMs(task, now))}`;
  if (task.state === 'READY' && task.assigneeId === undefined) return 'Unassigned';
  return undefined;
}

/** Store manager: what needs a decision, and what each associate is doing and will do next. */
export default function ManagerScreen() {
  const now = useNow();
  const tasks = useTaskStore((s) => s.tasks);
  const associates = useTaskStore((s) => s.associates);

  const attention = tasks
    .map((task) => ({ task, reason: attentionReason(task, now) }))
    .filter((a): a is { task: Task; reason: string } => a.reason !== undefined)
    .sort(
      (a, b) =>
        Number(b.task.priority === 'P0') - Number(a.task.priority === 'P0') ||
        Number(b.task.state === 'ESCALATED') - Number(a.task.state === 'ESCALATED') ||
        a.task.priority.localeCompare(b.task.priority) ||
        a.task.createdAt - b.task.createdAt,
    );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <ThemedText type="title">Store</ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dispatch a task"
              onPress={() => router.push('/dispatch')}
              style={({ pressed }) => [styles.dispatch, pressed && styles.pressed]}>
              <ThemedText style={styles.dispatchLabel}>+ Dispatch</ThemedText>
            </Pressable>
          </View>

          <ThemedText type="subtitle">Needs attention</ThemedText>
          {attention.length === 0 ? (
            <ThemedText themeColor="textSecondary">Nothing waiting on you.</ThemedText>
          ) : (
            attention.map(({ task, reason }) => (
              <Pressable
                key={task.id}
                accessibilityRole="button"
                accessibilityHint="Choose who should take this task"
                onPress={() => router.push({ pathname: '/assign/[id]', params: { id: task.id } })}
                style={({ pressed }) => pressed && styles.pressed}>
                <TaskCard task={task} now={now} reason={`${reason} · Tap to assign`} />
              </Pressable>
            ))
          )}

          <ThemedText type="subtitle">Team</ThemedText>
          {associates.map((associate) => {
            const mine = tasks.filter((t) => t.assigneeId === associate.id);
            return (
              <TeamMemberCard
                key={associate.id}
                associate={associate}
                current={mine.find((t) => t.state === 'IN_PROGRESS')}
                pausedCount={mine.filter((t) => t.state === 'PAUSED').length}
                queue={rankTasks(mine, associate, now).slice(0, QUEUE_PREVIEW)}
                now={now}
              />
            );
          })}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dispatch: {
    minHeight: TouchTarget,
    paddingHorizontal: Spacing.four,
    borderRadius: TouchTarget / 2,
    justifyContent: 'center',
    backgroundColor: PriorityColors.P2,
  },
  dispatchLabel: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 700,
  },
  pressed: {
    opacity: 0.7,
  },
});
