import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button,
  ButtonRail,
  IndeterminateLoader,
  InputTextView,
  Page,
} from '@wearables-ui-toolkit/mrbd';
import { askMuse } from './ha';
import { isConfigured, loadSettings } from './settings';
import { speak, stopSpeaking } from './speech';

interface Turn {
  role: 'user' | 'muse';
  text: string;
}

type Phase = 'idle' | 'thinking' | 'speaking';

interface ChatScreenProps {
  onOpenSettings: () => void;
}

const WELCOME: Turn = {
  role: 'muse',
  text: 'Hi, I am Muse. Focus the field below and talk to me.',
};

export default function ChatScreen({ onOpenSettings }: ChatScreenProps) {
  const [turns, setTurns] = useState<Turn[]>([WELCOME]);
  const [draft, setDraft] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const conversationId = useRef<string | undefined>(undefined);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const sendToken = useRef(0);

  // Keep the latest turn visible.
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, phase]);

  // Never leave speech running after the screen unmounts.
  useEffect(() => () => stopSpeaking(), []);

  const handleStop = useCallback(() => {
    sendToken.current += 1; // invalidate any in-flight turn
    stopSpeaking();
    setPhase('idle');
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || phase !== 'idle') return;

      const settings = loadSettings();
      if (!isConfigured(settings)) {
        setError('Set your Home Assistant URL and token in Settings first.');
        return;
      }

      const token = ++sendToken.current;
      setError(null);
      setDraft('');
      setTurns((prev) => [...prev, { role: 'user', text: trimmed }]);
      setPhase('thinking');

      try {
        const { reply, conversationId: nextId } = await askMuse(
          settings,
          trimmed,
          conversationId.current,
        );
        if (token !== sendToken.current) return; // superseded by Stop
        conversationId.current = nextId;
        setTurns((prev) => [...prev, { role: 'muse', text: reply }]);
        setPhase('speaking');
        try {
          await speak(reply);
        } catch (speechErr) {
          // Text is already on screen; speech failing is non-fatal.
          console.warn('Speech failed:', speechErr);
        }
        if (token === sendToken.current) setPhase('idle');
      } catch (err) {
        if (token !== sendToken.current) return;
        setError(err instanceof Error ? err.message : 'Something went wrong.');
        setPhase('idle');
      }
    },
    [phase],
  );

  return (
    <Page headerText="Muse Voice">
      <div className="mv-transcript" ref={transcriptRef} aria-live="polite">
        {turns.map((turn, i) => (
          <div
            key={i}
            className={`mv-turn ${turn.role === 'user' ? 'mv-user' : ''}`}
          >
            <div className="mv-role">{turn.role === 'user' ? 'You' : 'Muse'}</div>
            <div className="mv-text">{turn.text}</div>
          </div>
        ))}
      </div>

      {phase === 'thinking' && (
        <div className="mv-status">
          <IndeterminateLoader />
          <span>Thinking…</span>
        </div>
      )}
      {phase === 'speaking' && (
        <div className="mv-status">
          <span>Speaking…</span>
        </div>
      )}
      {error && (
        <div className="mv-error" role="alert">
          {error}
        </div>
      )}

      <div className="mv-composer">
        <InputTextView
          text={draft}
          onTextChange={setDraft}
          onSend={handleSend}
          hint="Talk to Muse…"
          actionLabel="Send to Muse"
          showActionButton
          showLoader={phase === 'thinking'}
          loadingLabel="Waiting for Muse"
          inputProps={{ 'aria-label': 'Message to Muse' }}
        />
      </div>

      <ButtonRail>
        <Button title="Settings" onClick={onOpenSettings} />
        {phase === 'speaking' && (
          <Button title="Stop" onClick={handleStop} />
        )}
        {phase === 'thinking' && (
          <Button title="Cancel" onClick={handleStop} />
        )}
      </ButtonRail>
    </Page>
  );
}
