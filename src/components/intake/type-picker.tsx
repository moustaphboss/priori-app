import { Pressable, StyleSheet, View } from 'react-native';

import { TaskTypeIcon } from '@/components/task/task-type-icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing, TouchTarget } from '@/constants/theme';
import type { TaskType } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';

const OPTIONS: { value: TaskType; label: string }[] = [
  { value: 'spill', label: 'Hazard' },
  { value: 'customer', label: 'Customer' },
  { value: 'bopis', label: 'Order' },
  { value: 'restock', label: 'Restock' },
  { value: 'check', label: 'Check' },
];

type TypePickerProps = {
  value: TaskType;
  onChange: (value: TaskType) => void;
};

export function TypePicker({ value, onChange }: TypePickerProps) {
  const theme = useTheme();

  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.option,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: selected ? theme.text : 'transparent',
              },
              pressed && styles.pressed,
            ]}>
            <TaskTypeIcon type={option.value} size={16} />
            <ThemedText type="small" themeColor={selected ? 'text' : 'textSecondary'}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  option: {
    minHeight: TouchTarget - Spacing.two,
    borderRadius: Spacing.four,
    borderWidth: 2,
    paddingLeft: Spacing.one,
    paddingRight: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
