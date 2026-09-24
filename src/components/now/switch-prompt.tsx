import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PriorityColors, Spacing, TouchTarget } from '@/constants/theme';
import type { RankedTask } from '@/domain/priority';

type SwitchPromptProps = {
  candidate: RankedTask;
  onSwitch: () => void;
  /** Omit to make the prompt non-dismissable (P0). */
  onDismiss?: () => void;
};

/** Suggests interrupting the current task for a clearly more urgent one. The associate decides. */
export function SwitchPrompt({ candidate, onSwitch, onDismiss }: SwitchPromptProps) {
  const { task, reason } = candidate;

  return (
    <View
      accessibilityRole="alert"
      style={[styles.container, { backgroundColor: PriorityColors[task.priority] }]}>
      <View>
        <Text style={styles.eyebrow}>
          {task.priority} · {reason}
        </Text>
        <Text style={styles.title}>{task.title}</Text>
      </View>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={onSwitch}
          style={({ pressed }) => [styles.button, styles.primary, pressed && styles.pressed]}>
          <Text style={[styles.label, { color: PriorityColors[task.priority] }]}>Switch now</Text>
        </Pressable>
        {onDismiss && (
          <Pressable
            accessibilityRole="button"
            onPress={onDismiss}
            style={({ pressed }) => [styles.button, styles.secondary, pressed && styles.pressed]}>
            <Text style={[styles.label, styles.secondaryLabel]}>Not now</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  eyebrow: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: 600,
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    lineHeight: 26,
    fontWeight: 700,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  button: {
    flex: 1,
    minHeight: TouchTarget,
    borderRadius: Spacing.three,
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
  label: {
    fontSize: 18,
    fontWeight: 600,
  },
  secondaryLabel: {
    color: '#ffffff',
  },
});
