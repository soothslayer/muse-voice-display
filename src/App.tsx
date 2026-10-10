import { useState } from 'react';
import { App as ToolkitApp } from '@wearables-ui-toolkit/mrbd';
import ChatScreen from './ChatScreen';
import SettingsScreen from './SettingsScreen';

type Screen = 'chat' | 'settings';

export default function App() {
  const [screen, setScreen] = useState<Screen>('chat');

  return (
    <ToolkitApp>
      {screen === 'chat' ? (
        <ChatScreen onOpenSettings={() => setScreen('settings')} />
      ) : (
        <SettingsScreen onDone={() => setScreen('chat')} />
      )}
    </ToolkitApp>
  );
}
