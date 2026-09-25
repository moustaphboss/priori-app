import { StyleSheet, Text, View } from 'react-native';

import { PriorityColors, Spacing } from '@/constants/theme';
import type { PriorityClass } from '@/domain/types';

type PriorityBadgeProps = {
  priority: PriorityClass;
  /** White badge with coloured text, for use on a coloured background. */
  inverted?: boolean;
};

export function PriorityBadge({ priority, inverted }: PriorityBadgeProps) {
  const color = PriorityColors[priority];
  return (
    <View
      accessibilityLabel={`Priority ${priority}`}
      style={[styles.badge, { backgroundColor: inverted ? '#ffffff' : color }]}>
      <Text style={[styles.label, inverted && { color }]}>{priority}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.two,
    alignSelf: 'flex-start',
  },
  label: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 700,
  },
});
