import { useState } from 'react';
import {
  Button,
  InputTextView,
  Page,
  useBackNavigation,
} from '@wearables-ui-toolkit/mrbd';
import { listConversationAgents, type ConversationAgent } from './ha';
import {
  DEFAULT_CONVERSATION_AGENT,
  loadSettings,
  normalizeUrl,
  saveSettings,
} from './settings';

interface SettingsScreenProps {
  onDone: () => void;
}

export default function SettingsScreen({ onDone }: SettingsScreenProps) {
  const [url, setUrl] = useState(() => loadSettings().url);
  const [token, setToken] = useState(() => loadSettings().token);
  const [agentId, setAgentId] = useState(() => loadSettings().agentId);
  const [agents, setAgents] = useState<ConversationAgent[] | null>(null);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [agentsError, setAgentsError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Escape / system Back returns to chat, like the Done button.
  useBackNavigation(() => {
    onDone();
  });

  const handleSave = () => {
    saveSettings({
      url: normalizeUrl(url),
      token: token.trim(),
      agentId: agentId.trim() || DEFAULT_CONVERSATION_AGENT,
    });
    setSaved(true);
  };

  const handleRefreshAgents = async () => {
    setAgentsLoading(true);
    setAgentsError(null);
    try {
      const list = await listConversationAgents(url, token);
      setAgents(list);
      // Prefer Muse when it's available and nothing else was chosen.
      if (
        list.some((a) => a.id === DEFAULT_CONVERSATION_AGENT) &&
        (!agentId || agentId === DEFAULT_CONVERSATION_AGENT)
      ) {
        setAgentId(DEFAULT_CONVERSATION_AGENT);
      }
    } catch (err) {
      setAgentsError(
        err instanceof Error ? err.message : 'Could not load conversation agents.',
      );
    } finally {
      setAgentsLoading(false);
    }
  };

  return (
    <Page headerText="Settings">
      <div className="mv-settings">
        <div className="mv-hint">
          Connect to Home Assistant, where the Muse conversation integration
          runs. Create a long-lived token under your HA profile, then Security.
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

        <div>
          <div className="mv-field-label">Conversation agent</div>
          <div className="mv-hint">
            Which assistant answers you. Defaults to Muse.
          </div>
          <Button
            title={agentsLoading ? 'Loading…' : 'Load agents'}
            onClick={handleRefreshAgents}
          />
          {agentsError && (
            <div className="mv-hint" role="alert">
              {agentsError}
            </div>
          )}
          {agents && (
            <div className="mv-agent-list">
              {agents.map((a) => (
                <Button
                  key={a.id}
                  title={`${a.id === agentId.trim() ? '✓ ' : ''}${a.name}`}
                  onClick={() => {
                    setAgentId(a.id);
                    setSaved(false);
                  }}
                />
              ))}
            </div>
          )}
          {(!agents || agentsError) && (
            <InputTextView
              text={agentId}
              onTextChange={(t) => {
                setAgentId(t);
                setSaved(false);
              }}
              hint={DEFAULT_CONVERSATION_AGENT}
              showActionButton={false}
              inputProps={{
                'aria-label': 'Conversation agent id',
                autoCapitalize: 'off',
                autoCorrect: 'off',
              }}
            />
          )}
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
