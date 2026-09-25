import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BrandColor, Spacing, TouchTarget } from '@/constants/theme';
import type { AssigneeRecommendation } from '@/domain/dispatch';
import { useTheme } from '@/hooks/use-theme';

/** Selected associate id, or `null` to leave the task open for whoever ranks it highest. */
export type AssigneeChoice = string | null;

type AssigneePickerProps = {
  recommendations: AssigneeRecommendation[];
  value: AssigneeChoice;
  onChange: (value: AssigneeChoice) => void;
  /** Offer "Anyone" (unassigned). */
  allowOpen?: boolean;
  /** When false, the list isn't a ranking: no "Recommended" label and no scores. */
  ranked?: boolean;
};

export function AssigneePicker({
  recommendations,
  value,
  onChange,
  allowOpen,
  ranked = true,
}: AssigneePickerProps) {
  const theme = useTheme();

  const option = (key: string, selected: boolean, onPress: () => void, body: React.ReactNode) => (
    <Pressable
      key={key}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: selected ? BrandColor : 'transparent',
        },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.radio, { borderColor: selected ? BrandColor : theme.textSecondary }]}>
        {selected && <View style={[styles.dot, { backgroundColor: BrandColor }]} />}
      </View>
      <View style={styles.text}>{body}</View>
    </Pressable>
  );

  return (
    <View style={styles.list} accessibilityRole="radiogroup">
      {recommendations.map((rec, i) =>
        option(
          rec.associate.id,
          value === rec.associate.id,
          () => onChange(rec.associate.id),
          <>
            <View style={styles.nameRow}>
              <ThemedText style={styles.name}>{rec.associate.name}</ThemedText>
              {ranked && i === 0 && (
                <ThemedText type="smallBold" themeColor="textSecondary">
                  RECOMMENDED
                </ThemedText>
              )}
              {ranked && (
                <ThemedText type="small" themeColor="textSecondary" style={styles.score}>
                  {Math.round(rec.score * 100)}
                </ThemedText>
              )}
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {rec.reasons.join(' · ')}
            </ThemedText>
          </>,
        ),
      )}
      {allowOpen &&
        option(
          'open',
          value === null,
          () => onChange(null),
          <>
            <ThemedText style={styles.name}>Anyone</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Leave open: it goes into everyone&apos;s ranked list
            </ThemedText>
          </>,
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
  option: {
    minHeight: TouchTarget,
    borderRadius: Spacing.three,
    borderWidth: 2,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
  },
  name: {
    fontSize: 18,
    fontWeight: 600,
  },
  score: {
    marginLeft: 'auto',
    fontVariant: ['tabular-nums'],
  },
});
