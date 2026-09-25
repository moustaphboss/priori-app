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

type TaskTypeIconProps = {
  type: TaskType;
  size?: number;
  /** White icon on a translucent circle, for use on a coloured background. */
  inverted?: boolean;
};

export function TaskTypeIcon({ type, size = 22, inverted }: TaskTypeIconProps) {
  const theme = useTheme();

  return (
    <ThemedView
      type="backgroundSelected"
      accessibilityLabel={type}
      style={[
        styles.container,
        { width: size * 2, height: size * 2, borderRadius: size },
        inverted && styles.inverted,
      ]}>
      <SymbolView name={ICONS[type]} size={size} tintColor={inverted ? '#ffffff' : theme.text} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  inverted: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.half,
  },
});
