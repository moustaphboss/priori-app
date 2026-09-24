import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/task/action-button';
import { PriorityBadge } from '@/components/task/priority-badge';
import { TaskTypeIcon } from '@/components/task/task-type-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing, TouchTarget } from '@/constants/theme';
import { createEventTask, SIMULATED_EVENTS, type SimulatedEvent } from '@/data/mock-events';
import { useTaskStore } from '@/store/task-store';

/** Dev panel: inject mock events to demo the ranking changing live. */
export default function SimulateScreen() {
  const { addTask, reset } = useTaskStore.getState();
  const [lastAdded, setLastAdded] = useState<string>();

  const fire = (event: SimulatedEvent) => {
    const task = createEventTask(event);
    addTask(task);
    setLastAdded(task.title);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title">Simulate</ThemedText>
          <ThemedText themeColor="textSecondary">
            Inject store events, then switch to Now to see the ranking react.
          </ThemedText>

          <View style={styles.list}>
            {SIMULATED_EVENTS.map((event) => (
              <Pressable
                key={event.id}
                accessibilityRole="button"
                onPress={() => fire(event)}
                style={({ pressed }) => pressed && styles.pressed}>
                <ThemedView type="backgroundElement" style={styles.row}>
                  <TaskTypeIcon type={event.type} />
                  <View style={styles.text}>
                    <ThemedText style={styles.label}>{event.label}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {event.description}
                    </ThemedText>
                  </View>
                  <PriorityBadge priority={event.priority} />
                </ThemedView>
              </Pressable>
            ))}
          </View>

          <ThemedText type="small" themeColor="textSecondary" style={styles.status}>
            {lastAdded ? `Added: ${lastAdded}` : ' '}
          </ThemedText>

          <View style={styles.reset}>
            <ActionButton
              label="Reset demo"
              tone="secondary"
              onPress={() => {
                reset();
                setLastAdded(undefined);
              }}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  content: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  list: {
    gap: Spacing.two,
  },
  row: {
    minHeight: TouchTarget + Spacing.three,
    borderRadius: Spacing.four,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
  text: {
    flex: 1,
  },
  label: {
    fontSize: 18,
    fontWeight: 600,
  },
  status: {
    textAlign: 'center',
  },
  reset: {
    flexDirection: 'row',
  },
});
