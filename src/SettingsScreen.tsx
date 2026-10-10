import { useState } from 'react';
import {
  Button,
  InputTextView,
  Page,
  useBackNavigation,
} from '@wearables-ui-toolkit/mrbd';
import { loadSettings, normalizeUrl, saveSettings } from './settings';

interface SettingsScreenProps {
  onDone: () => void;
}

export default function SettingsScreen({ onDone }: SettingsScreenProps) {
  const [url, setUrl] = useState(() => loadSettings().url);
  const [token, setToken] = useState(() => loadSettings().token);
  const [saved, setSaved] = useState(false);

  // Escape / system Back returns to chat, like the Done button.
  useBackNavigation(() => {
    onDone();
  });

  const handleSave = () => {
    saveSettings({ url: normalizeUrl(url), token: token.trim() });
    setSaved(true);
  };

  return (
    <Page headerText="Settings">
      <div className="mv-settings">
        <div className="mv-hint">
          Connect to Home Assistant, where the Muse conversation integration
          runs. Create a long-lived token under your HA profile, then Security.
          Make sure Muse is the default conversation agent.
        </div>

        <div>
          <div className="mv-field-label">Home Assistant URL</div>
          <InputTextView
            text={url}
            onTextChange={(t) => {
              setUrl(t);
              setSaved(false);
            }}
            hint="https://home.example.com"
            showActionButton={false}
            inputProps={{
              'aria-label': 'Home Assistant URL',
              inputMode: 'url',
              autoCapitalize: 'off',
              autoCorrect: 'off',
            }}
          />
        </div>

        <div>
          <div className="mv-field-label">Long-lived access token</div>
          <InputTextView
            text={token}
            onTextChange={(t) => {
              setToken(t);
              setSaved(false);
            }}
            hint="Paste token here"
            showActionButton={false}
            inputProps={{
              'aria-label': 'Home Assistant long-lived access token',
              autoCapitalize: 'off',
              autoCorrect: 'off',
            }}
          />
        </div>

        {saved && (
          <div className="mv-hint" role="status">
            Saved on this device.
          </div>
        )}

        <div className="mv-settings-actions">
          <Button title="Save" onClick={handleSave} />
          <Button title="Done" onClick={onDone} />
        </div>
      </div>
    </Page>
  );
}
