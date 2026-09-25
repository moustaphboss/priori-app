import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { BrandColor, Colors } from '@/constants/theme';
import { useTaskStore } from '@/store/task-store';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const isManager = useTaskStore((s) => s.role === 'manager');

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      tintColor={BrandColor}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{isManager ? 'Store' : 'Now'}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={isManager ? 'person.3.fill' : 'house.fill'}
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="simulate">
        <NativeTabs.Trigger.Label>Simulate</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="bolt.fill"
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
