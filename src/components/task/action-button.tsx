import { Pressable, StyleSheet, Text } from 'react-native';

import { Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'secondary';
};

export function ActionButton({ label, onPress, tone = 'primary' }: ActionButtonProps) {
  const theme = useTheme();
  const isPrimary = tone === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: isPrimary ? theme.text : theme.backgroundSelected },
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.label, { color: isPrimary ? theme.background : theme.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    minHeight: TouchTarget,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    fontSize: 18,
    fontWeight: 600,
  },
});
