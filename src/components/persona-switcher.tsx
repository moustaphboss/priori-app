import { SymbolView } from 'expo-symbols';
import { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { MANAGER_PERSONA, useTaskStore } from '@/store/task-store';

type Anchor = { x: number; y: number };

/** Top-left dropdown to switch between associates and the store manager. Stands in for sign-in. */
export function PersonaSwitcher() {
  const theme = useTheme();
  const role = useTaskStore((s) => s.role);
  const associate = useTaskStore((s) => s.associate);
  const associates = useTaskStore((s) => s.associates);
  const { switchPersona } = useTaskStore.getState();
  const buttonRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<Anchor>();

  const currentId = role === 'manager' ? MANAGER_PERSONA : associate.id;
  const name = role === 'manager' ? 'Store manager' : associate.name;

  const open = () =>
    buttonRef.current?.measureInWindow((x, y, _w, height) => setAnchor({ x, y: y + height + 6 }));
  const close = () => setAnchor(undefined);
  const choose = (personaId: string) => {
    switchPersona(personaId);
    close();
  };

  const option = (id: string, label: string, detail?: string) => {
    const selected = id === currentId;
    return (
      <Pressable
        key={id}
        accessibilityRole="menuitem"
        accessibilityState={{ selected }}
        onPress={() => choose(id)}
        style={({ pressed }) => [
          styles.option,
          { backgroundColor: pressed ? theme.backgroundSelected : 'transparent' },
        ]}>
        <View style={styles.optionText}>
          <ThemedText style={selected && styles.selectedLabel}>{label}</ThemedText>
          {detail && (
            <ThemedText type="small" themeColor="textSecondary">
              {detail}
            </ThemedText>
          )}
        </View>
        {selected && (
          <SymbolView
            name={{ ios: 'checkmark', android: 'check', web: 'check' }}
            size={18}
            tintColor={theme.text}
          />
        )}
      </Pressable>
    );
  };

  return (
    <>
      <Pressable
        ref={buttonRef}
        accessibilityRole="button"
        accessibilityLabel={`Signed in as ${name}. Switch persona`}
        onPress={open}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}>
        <ThemedView type="backgroundSelected" style={styles.avatar}>
          <ThemedText type="smallBold">{name.charAt(0)}</ThemedText>
        </ThemedView>
        <ThemedText type="smallBold">{name}</ThemedText>
        <SymbolView
          name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
          size={14}
          tintColor={theme.textSecondary}
        />
      </Pressable>

      <Modal transparent visible={anchor !== undefined} animationType="fade" onRequestClose={close}>
        <Pressable accessibilityLabel="Close menu" style={styles.backdrop} onPress={close} />
        {anchor && (
          <ThemedView
            accessibilityRole="menu"
            style={[styles.menu, { top: anchor.y, left: anchor.x, shadowColor: '#000' }]}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.section}>
              ASSOCIATES
            </ThemedText>
            {associates.map((a) => option(a.id, a.name, a.location))}
            <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.section}>
              MANAGEMENT
            </ThemedText>
            {option(MANAGER_PERSONA, 'Store manager')}
            <ThemedText type="small" themeColor="textSecondary" style={styles.footnote}>
              Demo only. Real roles would come from sign-in.
            </ThemedText>
          </ThemedView>
        )}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.two,
    minHeight: 44,
    paddingRight: Spacing.two,
  },
  pressed: {
    opacity: 0.6,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  menu: {
    position: 'absolute',
    width: 260,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.two,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  section: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
  },
  option: {
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  optionText: {
    flex: 1,
  },
  selectedLabel: {
    fontWeight: 700,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.two,
    marginHorizontal: Spacing.three,
  },
  footnote: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
});
