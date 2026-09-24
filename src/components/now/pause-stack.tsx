import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, TouchTarget } from '@/constants/theme';
import { formatDuration } from '@/domain/format';
import { elapsedMs } from '@/domain/time';
import type { Task } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';

type PauseStackProps = {
  /** Paused tasks, most recent first. */
  tasks: Task[];
  now: number;
  onResume: (task: Task) => void;
};

/** Stacked indicator of paused tasks. Tapping resumes the most recent one. */
export function PauseStack({ tasks, now, onResume }: PauseStackProps) {
  const theme = useTheme();
  const [top] = tasks;
  if (!top) return null;

  const hidden = tasks.length - 1;
  const layers = Math.min(hidden, 2);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Resume ${top.title}. ${tasks.length} paused.`}
      onPress={() => onResume(top)}
      style={({ pressed }) => [{ paddingBottom: layers * 5 }, pressed && styles.pressed]}>
      {Array.from({ length: layers }, (_, i) => (
        <View
          key={i}
          style={[
            styles.layer,
            {
              backgroundColor: theme.backgroundSelected,
              // Farthest layer (i = 0) peeks out lowest and narrowest.
              bottom: i * 5,
              marginHorizontal: (layers - i) * Spacing.two,
              opacity: 1 - (layers - i) * 0.3,
            },
          ]}
        />
      ))}
      <ThemedView type="backgroundSelected" style={styles.front}>
        <SymbolView
          name={{ ios: 'pause.circle.fill', android: 'pause_circle', web: 'pause_circle' }}
          size={28}
          tintColor={theme.textSecondary}
        />
        <View style={styles.text}>
          <ThemedText type="smallBold" numberOfLines={1}>
            Paused · {top.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatDuration(elapsedMs(top, now))} worked · tap to resume
          </ThemedText>
        </View>
        {hidden > 0 && (
          <ThemedText type="smallBold" themeColor="textSecondary">
            +{hidden}
          </ThemedText>
        )}
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.7,
  },
  layer: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: TouchTarget,
    borderRadius: Spacing.three,
  },
  front: {
    minHeight: TouchTarget + Spacing.two,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  text: {
    flex: 1,
  },
});
