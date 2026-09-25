import { router } from 'expo-router';
import { Platform, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AssistantOrb } from '@/components/assistant/assistant-orb';
import { Spacing } from '@/constants/theme';

const SIZE = 64;
/** Native tab bar height above the home-indicator inset. */
const TAB_BAR_HEIGHT = Platform.select({ ios: 49, android: 80 }) ?? 0;

/** Floating AI orb above the tab bar. Opens the voice assistant sheet. */
export function AssistantButton() {
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Assistant. Describe a task by voice"
      onPress={() => router.push('/assistant')}
      hitSlop={Spacing.two}
      style={({ pressed }) => [
        styles.button,
        { bottom: insets.bottom + TAB_BAR_HEIGHT + Spacing.three },
        pressed && styles.pressed,
      ]}>
      <AssistantOrb size={SIZE} />
    </Pressable>
  );
}

/** Extra scroll padding so the orb never covers the last item on a screen. */
export const ASSISTANT_BUTTON_CLEARANCE = SIZE + Spacing.five;

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: Spacing.three,
    shadowColor: '#4C1D95',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  pressed: {
    transform: [{ scale: 0.94 }],
  },
});
