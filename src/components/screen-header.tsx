import { Pressable, StyleSheet, View } from 'react-native';

import { PersonaSwitcher } from '@/components/persona-switcher';
import { ThemedText } from '@/components/themed-text';
import { BrandColor, Spacing, TouchTarget } from '@/constants/theme';

type ScreenHeaderProps = {
  title: string;
  /** Primary action on the right, e.g. "+ Report". */
  action?: { label: string; accessibilityLabel: string; onPress: () => void };
};

/** Persona switcher on top, then the screen title with an optional action. */
export function ScreenHeader({ title, action }: ScreenHeaderProps) {
  return (
    <View style={styles.container}>
      <PersonaSwitcher />
      <View style={styles.row}>
        <ThemedText type="title">{title}</ThemedText>
        {action && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={action.accessibilityLabel}
            onPress={action.onPress}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
            <ThemedText style={styles.actionLabel}>{action.label}</ThemedText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  action: {
    minHeight: TouchTarget,
    paddingHorizontal: Spacing.four,
    borderRadius: TouchTarget / 2,
    justifyContent: 'center',
    backgroundColor: BrandColor,
  },
  actionLabel: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 700,
  },
  pressed: {
    opacity: 0.7,
  },
});
