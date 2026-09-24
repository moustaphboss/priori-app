import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { SafetyAlertHost } from '@/components/safety/safety-alert-host';
import { useSafetyWatchdog } from '@/hooks/use-safety-watchdog';
import { useTaskStore } from '@/store/task-store';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();

  useSafetyWatchdog();

  useEffect(() => {
    void useTaskStore.getState().load();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AppTabs />
      <SafetyAlertHost />
    </ThemeProvider>
  );
}
