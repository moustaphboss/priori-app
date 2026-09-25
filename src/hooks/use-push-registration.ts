import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';

import { taskRepository } from '@/data/task-repository';
import { getPushToken } from '@/lib/push';
import { MANAGER_PERSONA, useTaskStore } from '@/store/task-store';

/**
 * Registers this device's push token under the current persona, so the server can reach it
 * when the app is backgrounded or the phone is locked. Re-registers when the persona changes.
 */
export function usePushRegistration() {
  const persona = useTaskStore((s) => (s.role === 'manager' ? MANAGER_PERSONA : s.associate.id));

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = await getPushToken();
        if (token && !cancelled) await taskRepository.registerPushToken(token, persona);
      } catch (error) {
        console.warn('[push] registration failed', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [persona]);

  // Tapping a notification opens the home tab; P0 alerts then show themselves from store state.
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(() => {
      router.navigate('/');
    });
    return () => subscription.remove();
  }, []);
}
