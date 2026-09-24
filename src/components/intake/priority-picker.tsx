import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PriorityColors, Spacing, TouchTarget } from '@/constants/theme';
import type { PriorityClass } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';

const OPTIONS: { value: PriorityClass; label: string }[] = [
  { value: 'P0', label: 'Safety' },
  { value: 'P1', label: 'Urgent' },
  { value: 'P2', label: 'Normal' },
  { value: 'P3', label: 'Low' },
];

type PriorityPickerProps = {
  value: PriorityClass;
  onChange: (value: PriorityClass) => void;
};

export function PriorityPicker({ value, onChange }: PriorityPickerProps) {
  const theme = useTheme();

  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {OPTIONS.map((option) => {
        const selected = option.value === value;
        const color = PriorityColors[option.value];
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={`${option.value} ${option.label}`}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.option,
              { backgroundColor: selected ? color : theme.backgroundElement },
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.value, { color: selected ? '#ffffff' : color }]}>{option.value}</Text>
            <Text style={[styles.label, { color: selected ? '#ffffff' : theme.textSecondary }]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  option: {
    flex: 1,
    minHeight: TouchTarget,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  value: {
    fontSize: 18,
    fontWeight: 700,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
  },
});
