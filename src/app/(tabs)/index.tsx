import { View } from 'react-native';

import { AssistantButton } from '@/components/assistant/assistant-button';
import { ManagerView } from '@/components/manager/manager-view';
import { NowView } from '@/components/now/now-view';
import { useTaskStore } from '@/store/task-store';

/** Home tab: the associate's Now screen, or the store board for the manager persona. */
export default function HomeScreen() {
  const role = useTaskStore((s) => s.role);
  return (
    <View style={{ flex: 1 }}>
      {role === 'manager' ? <ManagerView /> : <NowView />}
      <AssistantButton />
    </View>
  );
}
