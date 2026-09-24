import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PriorityPicker } from '@/components/intake/priority-picker';
import { TypePicker } from '@/components/intake/type-picker';
import { ActionButton } from '@/components/task/action-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, TouchTarget } from '@/constants/theme';
import { createAdhocTask, suggestFromText } from '@/domain/intake';
import type { PriorityClass, TaskType } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { useTaskStore } from '@/store/task-store';

/** "What's going on?" — report an ad hoc task. Suggests type and priority; the associate decides. */
export default function IntakeScreen() {
  const theme = useTheme();
  const associate = useTaskStore((s) => s.associate);
  const { addTask } = useTaskStore.getState();

  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(associate.location ?? '');
  // Undefined until the associate overrides the suggestion.
  const [typeChoice, setTypeChoice] = useState<TaskType>();
  const [priorityChoice, setPriorityChoice] = useState<PriorityClass>();
  const [saving, setSaving] = useState(false);

  const suggestion = suggestFromText(description);
  const type = typeChoice ?? suggestion?.type ?? 'check';
  const priority = priorityChoice ?? suggestion?.priority ?? 'P3';
  const usingSuggestion =
    suggestion !== undefined && type === suggestion.type && priority === suggestion.priority;
  const canSubmit = description.trim().length >= 3 && !saving;

  const submit = async () => {
    setSaving(true);
    const saved = await addTask(createAdhocTask({ description, type, priority, location }));
    setSaving(false);
    if (!saved) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const inputStyle = [
    styles.input,
    { backgroundColor: theme.backgroundElement, color: theme.text },
  ];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          <View style={styles.header}>
            <ThemedText type="subtitle">Report</ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.back()}
              hitSlop={Spacing.three}
              style={({ pressed }) => pressed && styles.pressed}>
              <ThemedText themeColor="textSecondary">Cancel</ThemedText>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <TextInput
              autoFocus
              multiline
              value={description}
              onChangeText={setDescription}
              placeholder="What's going on?"
              placeholderTextColor={theme.textSecondary}
              style={[inputStyle, styles.description]}
              accessibilityLabel="What's going on?"
            />

            <View style={styles.field}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                WHERE
              </ThemedText>
              <TextInput
                value={location}
                onChangeText={setLocation}
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
                {suggestion && (
                  <ThemedText type="small" themeColor="textSecondary">
                    {usingSuggestion ? 'Suggested' : 'Changed'} · {suggestion.reason}
                  </ThemedText>
                )}
              </View>
              <PriorityPicker value={priority} onChange={setPriorityChoice} />
              {priority === 'P0' && (
                <ThemedText type="small" themeColor="textSecondary">
                  P0 alerts everyone on shift and escalates to a manager if nobody responds in 30 s.
                </ThemedText>
              )}
            </View>

            <View style={styles.field}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                TYPE
              </ThemedText>
              <TypePicker value={type} onChange={setTypeChoice} />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <ActionButton
              label={saving ? 'Adding…' : 'Add task'}
              disabled={!canSubmit}
              onPress={() => void submit()}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  pressed: {
    opacity: 0.6,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.four,
  },
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
  footer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
});
