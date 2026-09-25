import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { SafetyAlertHost } from '@/components/safety/safety-alert-host';
import { useSafetyWatchdog } from '@/hooks/use-safety-watchdog';
import { useTaskStore } from '@/store/task-store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useSafetyWatchdog();

  useEffect(() => {
    void useTaskStore.getState().load();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="intake" options={{ presentation: 'modal' }} />
        <Stack.Screen name="dispatch" options={{ presentation: 'modal' }} />
        <Stack.Screen name="assign/[id]" options={{ presentation: 'modal' }} />
      </Stack>
      <SafetyAlertHost />
    </ThemeProvider>
  );
}
