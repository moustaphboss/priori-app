import { StyleSheet, Text, View } from 'react-native';

import { PriorityColors, Spacing } from '@/constants/theme';
import type { PriorityClass } from '@/domain/types';

export function PriorityBadge({ priority }: { priority: PriorityClass }) {
  return (
    <View
      accessibilityLabel={`Priority ${priority}`}
      style={[styles.badge, { backgroundColor: PriorityColors[priority] }]}>
      <Text style={styles.label}>{priority}</Text>
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
