import { StyleSheet, TextInput, View } from 'react-native';

import { PriorityPicker } from '@/components/intake/priority-picker';
import { TypePicker } from '@/components/intake/type-picker';
import { ThemedText } from '@/components/themed-text';
import { Spacing, TouchTarget } from '@/constants/theme';
import type { TaskDraftState } from '@/hooks/use-task-draft';
import { useTheme } from '@/hooks/use-theme';

type TaskDraftFieldsProps = {
  draft: TaskDraftState;
  placeholder: string;
};

/** Description, location, priority and type fields shared by Report and Dispatch. */
export function TaskDraftFields({ draft, placeholder }: TaskDraftFieldsProps) {
  const theme = useTheme();
  const inputStyle = [styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }];

  return (
    <>
      <TextInput
        autoFocus
        multiline
        value={draft.description}
        onChangeText={draft.setDescription}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        style={[inputStyle, styles.description]}
        accessibilityLabel={placeholder}
      />

      <View style={styles.field}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          WHERE
        </ThemedText>
        <TextInput
          value={draft.location}
          onChangeText={draft.setLocation}
          placeholder="e.g. Aisle 5"
          placeholderTextColor={theme.textSecondary}
          style={inputStyle}
          returnKeyType="done"
        />
      </View>

      <View style={styles.field}>
        <View style={styles.labelRow}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            PRIORITY
          </ThemedText>
          {draft.suggestion && (
            <ThemedText type="small" themeColor="textSecondary">
              {draft.usingSuggestion ? 'Suggested' : 'Changed'} · {draft.suggestion.reason}
            </ThemedText>
          )}
        </View>
        <PriorityPicker value={draft.priority} onChange={draft.setPriority} />
        {draft.priority === 'P0' && (
          <ThemedText type="small" themeColor="textSecondary">
            P0 alerts immediately and escalates to a manager if nobody responds in 30 s.
          </ThemedText>
        )}
      </View>

      <View style={styles.field}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          TYPE
        </ThemedText>
        <TypePicker value={draft.type} onChange={draft.setType} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: TouchTarget,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 18,
  },
  description: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  field: {
    gap: Spacing.two,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: Spacing.two,
  },
});
