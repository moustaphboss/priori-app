import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';

import { taskRepository } from '@/data/task-repository';
import { ACK_ACTION, getPushToken, registerNotificationCategories } from '@/lib/push';
import { MANAGER_PERSONA, useTaskStore } from '@/store/task-store';

type PushData = { taskId?: string; persona?: string };

// A response can arrive both as "last response" on cold start and via the listener.
const handledResponses = new Set<string>();

/** Notification tapped, or its "I'm on it" button pressed. */
function handleResponse(response: Notifications.NotificationResponse) {
  const id = response.notification.request.identifier;
  if (handledResponses.has(id)) return;
  handledResponses.add(id);

  const data = response.notification.request.content.data as PushData;
  if (response.actionIdentifier === ACK_ACTION && data.taskId) {
    const store = useTaskStore.getState();
    // Acknowledge as the person the push was sent to, even if the app just cold-started.
    if (data.persona && data.persona !== MANAGER_PERSONA) store.switchPersona(data.persona);
    void store.acknowledge(data.taskId);
  }
  // Open the home tab; any P0 still waiting shows its full-screen alert from store state.
  router.navigate('/');
  Notifications.clearLastNotificationResponse();
}

/**
 * Registers this device's push token under the current persona, so the server can reach it
 * when the app is backgrounded or the phone is locked. Re-registers when the persona changes.
 * Also handles notification taps and the "I'm on it" action.
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

  useEffect(() => {
    void registerNotificationCategories().catch((error) =>
      console.warn('[push] category registration failed', error),
    );
    // The app may have been launched by tapping a notification or its button.
    const last = Notifications.getLastNotificationResponse();
    if (last) handleResponse(last);
    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
    return () => subscription.remove();
  }, []);
}
