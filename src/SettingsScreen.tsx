import { useEffect, useState } from 'react';
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
  saveSettings,
} from './settings';

interface SettingsScreenProps {
  onDone: () => void;
}

type View = 'form' | 'agents';

export default function SettingsScreen({ onDone }: SettingsScreenProps) {
  const [initial] = useState(() => loadSettings());
  const [agentId, setAgentId] = useState(() => loadSettings().agentId);
  const [view, setView] = useState<View>('form');
  const [saved, setSaved] = useState(false);

  // Escape / system Back returns to chat, like the Back button.
  useBackNavigation(() => {
    if (view === 'agents') setView('form');
    else onDone();
  });

  const handleSave = () => {
    saveSettings({
      url: initial.url,
      token: initial.token,
      agentId: agentId.trim() || DEFAULT_CONVERSATION_AGENT,
    });
    setSaved(true);
  };

  if (view === 'agents') {
    return (
      <AgentPickerView
        url={initial.url}
        token={initial.token}
        agentId={agentId}
        onSelect={(id) => {
          setAgentId(id);
          setSaved(false);
          setView('form');
        }}
        onBack={() => setView('form')}
      />
    );
  }

  return (
    <Page headerText="Settings">
      <div className="mv-settings">
        <div>
          <div className="mv-field-label">Home Assistant URL</div>
          <div className="mv-readonly-value">
            {initial.url || 'Not set — add ?ha_url= to the web app URL.'}
          </div>
        </div>

        <div>
          <div className="mv-field-label">Access token</div>
          <div className="mv-readonly-value">
            {initial.token ? '✓ Set' : 'Not set — add &token= to the web app URL.'}
          </div>
        </div>

        <div>
          <div className="mv-field-label">Conversation agent</div>
          <div className="mv-agent-row">
            <div className="mv-agent-current" aria-live="polite">
              {agentId.trim() || DEFAULT_CONVERSATION_AGENT}
            </div>
            <Button title="Change" onClick={() => setView('agents')} />
          </div>
          <div className="mv-hint">Which assistant answers you.</div>
        </div>

        {saved && (
          <div className="mv-hint" role="status">
            Saved on this device.
          </div>
        )}

        <div className="mv-settings-actions">
          <Button title="Save" onClick={handleSave} />
          <Button title="Back" onClick={onDone} />
        </div>
      </div>
    </Page>
  );
}

interface AgentPickerViewProps {
  url: string;
  token: string;
  agentId: string;
  onSelect: (id: string) => void;
  onBack: () => void;
}

/** Full-screen agent picker: loads the live list, or falls back to a manual id. */
function AgentPickerView({ url, token, agentId, onSelect, onBack }: AgentPickerViewProps) {
  const [agents, setAgents] = useState<ConversationAgent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualId, setManualId] = useState(agentId);

  useBackNavigation(onBack);

  useEffect(() => {
    let cancelled = false;
    listConversationAgents(url, token)
      .then((list) => {
        if (cancelled) return;
        setAgents(list);
        // Prefer Muse when it's available.
        const muse = list.find((a) => a.id === DEFAULT_CONVERSATION_AGENT);
        if (muse) setManualId(muse.id);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load conversation agents.');
      });
    return () => {
      cancelled = true;
    };
  }, [url, token]);

  return (
    <Page headerText="Pick agent">
      <div className="mv-settings">
        {!agents && !error && <div className="mv-hint">Loading agents…</div>}
        {error && (
          <div className="mv-hint" role="alert">
            {error}
          </div>
        )}
        {agents && (
          <div className="mv-agent-list">
            {agents.map((a) => (
              <Button
                key={a.id}
                title={`${a.id === agentId.trim() ? '✓ ' : ''}${a.name}`}
                onClick={() => onSelect(a.id)}
              />
            ))}
          </div>
        )}
        {(error || (agents && agents.length === 0)) && (
          <div>
            <div className="mv-field-label">Agent id</div>
            <InputTextView
              text={manualId}
              onTextChange={setManualId}
              hint={DEFAULT_CONVERSATION_AGENT}
              showActionButton={false}
              inputProps={{
                'aria-label': 'Conversation agent id',
                autoCapitalize: 'off',
                autoCorrect: 'off',
              }}
            />
            <div className="mv-settings-actions">
              <Button title="Use this id" onClick={() => onSelect(manualId.trim() || DEFAULT_CONVERSATION_AGENT)} />
            </div>
          </div>
        )}
        <div className="mv-settings-actions">
          <Button title="Back" onClick={onBack} />
        </div>
      </div>
    </Page>
  );
}
