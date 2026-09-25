import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type SheetLayoutProps = {
  title: string;
  children: ReactNode;
  /** Pinned below the scrolling content, above the keyboard. */
  footer: ReactNode;
};

/** Modal sheet frame: title with Cancel, scrolling body, pinned footer. */
export function SheetLayout({ title, children, footer }: SheetLayoutProps) {
  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.flex}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          <View style={styles.header}>
            <ThemedText type="subtitle">{title}</ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.back()}
              hitSlop={Spacing.three}
              style={({ pressed }) => pressed && styles.pressed}>
              <ThemedText themeColor="textSecondary">Cancel</ThemedText>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>

          <View style={styles.footer}>{footer}</View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
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
  footer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
});
