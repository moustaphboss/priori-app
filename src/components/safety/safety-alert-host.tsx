import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Modal } from 'react-native';

import { SafetyAlert } from '@/components/safety/safety-alert';
import { awaitingAck } from '@/domain/safety';
import { useNow } from '@/hooks/use-now';
import { useTaskStore } from '@/store/task-store';

const alertSound = require('@/assets/audio/p0-alert.mp3');

/** Shows unacknowledged P0 alerts over every screen, oldest first, with sound and haptics. */
export function SafetyAlertHost() {
  const tasks = useTaskStore((s) => s.tasks);
  const { acknowledge } = useTaskStore.getState();
  const [leftToManager, setLeftToManager] = useState<string[]>([]);
  const now = useNow(250);
  const player = useAudioPlayer(alertSound);

  const pending = tasks
    .filter((t) => awaitingAck(t) && !leftToManager.includes(t.id))
    .sort((a, b) => a.createdAt - b.createdAt);
  const top = pending[0];

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true });
  }, []);

  // Alert again when a new P0 arrives and when it escalates.
  const alertKey = top ? `${top.id}:${top.state}` : undefined;
  useEffect(() => {
    if (!alertKey) return;
    void player.seekTo(0).then(() => player.play());
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, [alertKey, player]);

  return (
    <Modal visible={top !== undefined} animationType="fade" presentationStyle="fullScreen">
      {top && (
        <SafetyAlert
          task={top}
          now={now}
          queued={pending.length - 1}
          onAcknowledge={() => void acknowledge(top.id)}
          onLeaveToManager={() => setLeftToManager((ids) => [...ids, top.id])}
        />
      )}
    </Modal>
  );
}
