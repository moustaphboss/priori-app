import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PriorityColors, Spacing, TouchTarget } from '@/constants/theme';
import { formatDuration } from '@/domain/format';
import { ackRemainingMs, P0_ACK_WINDOW_MS } from '@/domain/safety';
import type { Task } from '@/domain/types';

type SafetyAlertProps = {
  task: Task;
  now: number;
  /** Other P0 alerts waiting behind this one. */
  queued: number;
  onAcknowledge: () => void;
  /** Shown only once the alert has escalated. */
  onLeaveToManager: () => void;
};

/** Full-screen P0 alert with the 30 s acknowledgement countdown. */
export function SafetyAlert({ task, now, queued, onAcknowledge, onLeaveToManager }: SafetyAlertProps) {
  const escalated = task.state === 'ESCALATED';
  const remaining = ackRemainingMs(task, now);

  return (
    <SafeAreaView style={[styles.container, escalated && styles.escalated]}>
      <View style={styles.body}>
        <Text style={styles.eyebrow}>
          {escalated ? 'Escalated to manager' : 'P0 · Safety'}
          {queued > 0 ? ` · +${queued} more` : ''}
        </Text>
        <Text style={styles.title}>{task.title}</Text>
        {task.location && <Text style={styles.location}>{task.location}</Text>}

        {escalated ? (
          <Text style={styles.note}>
            Nobody acknowledged within {P0_ACK_WINDOW_MS / 1000} s, so the manager has been
            alerted. You can still take it.
          </Text>
        ) : (
          <View style={styles.countdown} accessibilityLabel={`${Math.ceil(remaining / 1000)} seconds to acknowledge`}>
            <Text style={styles.countdownValue}>{formatDuration(remaining)}</Text>
            <Text style={styles.note}>to acknowledge</Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${(remaining / P0_ACK_WINDOW_MS) * 100}%` }]} />
            </View>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={onAcknowledge}
          style={({ pressed }) => [styles.button, styles.primary, pressed && styles.pressed]}>
          <Text style={styles.primaryLabel}>I&apos;m on it</Text>
        </Pressable>
        {escalated && (
          <Pressable
            accessibilityRole="button"
            onPress={onLeaveToManager}
            style={({ pressed }) => [styles.button, styles.secondary, pressed && styles.pressed]}>
            <Text style={styles.secondaryLabel}>Leave to manager</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PriorityColors.P0,
    paddingHorizontal: Spacing.four,
  },
  escalated: {
    backgroundColor: '#7A1A12',
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.two,
  },
  eyebrow: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 16,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    color: '#ffffff',
    fontSize: 40,
    lineHeight: 46,
    fontWeight: 800,
  },
  location: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 600,
  },
  countdown: {
    marginTop: Spacing.five,
    gap: Spacing.one,
  },
  countdownValue: {
    color: '#ffffff',
    fontSize: 64,
    lineHeight: 72,
    fontWeight: 700,
    fontVariant: ['tabular-nums'],
  },
  note: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 18,
    lineHeight: 26,
    marginTop: Spacing.two,
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginTop: Spacing.three,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#ffffff',
  },
  actions: {
    gap: Spacing.two,
    paddingBottom: Spacing.four,
  },
  button: {
    minHeight: TouchTarget + Spacing.three,
    borderRadius: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: '#ffffff',
  },
  secondary: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  pressed: {
    opacity: 0.7,
  },
  primaryLabel: {
    color: PriorityColors.P0,
    fontSize: 22,
    fontWeight: 700,
  },
  secondaryLabel: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 600,
  },
});
