import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/** Android channel for P0 alerts (max importance). Must match `channelId` sent by the server. */
export const SAFETY_CHANNEL = 'safety';

// In the foreground the app shows P0s as a full-screen alert already, so skip the system banner.
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const isP0 = notification.request.content.data?.priority === 'P0';
    return {
      shouldShowBanner: !isP0,
      shouldShowList: true,
      shouldPlaySound: !isP0,
      shouldSetBadge: false,
    };
  },
});

/** Asks for permission and returns this device's Expo push token, or undefined if unavailable. */
export async function getPushToken(): Promise<string | undefined> {
  if (Platform.OS === 'web') return undefined;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    console.warn('[push] No EAS projectId. Run `npx eas-cli init` to enable push notifications.');
    return undefined;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(SAFETY_CHANNEL, {
      name: 'Safety alerts',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 400, 200, 400],
    });
  }

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') ({ status } = await Notifications.requestPermissionsAsync());
  if (status !== 'granted') return undefined;

  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}
