import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { TaskType } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';

const ICONS: Record<TaskType, SymbolViewProps['name']> = {
  restock: { ios: 'shippingbox.fill', android: 'inventory_2', web: 'inventory_2' },
  check: { ios: 'checklist', android: 'fact_check', web: 'fact_check' },
  spill: { ios: 'drop.triangle.fill', android: 'water_drop', web: 'water_drop' },
  bopis: { ios: 'bag.fill', android: 'shopping_bag', web: 'shopping_bag' },
  customer: {
    ios: 'person.fill.questionmark',
    android: 'support_agent',
    web: 'support_agent',
  },
};

export function TaskTypeIcon({ type, size = 22 }: { type: TaskType; size?: number }) {
  const theme = useTheme();

  return (
    <ThemedView
      type="backgroundSelected"
      accessibilityLabel={type}
      style={[styles.container, { width: size * 2, height: size * 2, borderRadius: size }]}>
      <SymbolView name={ICONS[type]} size={size} tintColor={theme.text} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.half,
  },
});
