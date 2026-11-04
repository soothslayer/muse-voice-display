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
  const composerRef = useRef<HTMLDivElement>(null);
  // Mirrors `draft` for the batch check below (state alone would be stale
  // inside the onTextChange callback).
  const draftRef = useRef('');
  const sendToken = useRef(0);

  // Keep the latest turn visible.
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, phase]);

  // Focus the message field. The toolkit moves focus geometrically
  // (swipe down from wherever it starts), which is why opening the app
  // used to cost swipes before the field was even reachable. Focusing
  // the real textarea also sets the toolkit's own "text" focus state
  // via its onFocus handler, so a single Select then opens the system
  // composer (dictate or type) instead of needing navigation first.
  // Runs on open, on return from Settings (ChatScreen remounts), and
  // whenever a turn finishes, so the next dictation is ready at once.
  const focusField = useCallback(() => {
    composerRef.current
      ?.querySelector<HTMLTextAreaElement>('textarea')
      ?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (phase === 'idle') focusField();
  }, [phase, focusField]);

  // Dictation lands as one batch commit, not keystroke by keystroke:
  // the system composer returns the whole dictated string in a single
  // onTextChange call, so the draft grows by more than one character
  // at once. Direct typing grows by one character per change and is
  // deliberately left alone, so typing never steals focus mid-word.
  // On a batch commit while idle, land focus on Send (the button the
  // toolkit's ArrowRight/swipe-right handler would have moved to).
  // Sending is then one tap, no swipe right, and swiping left still
  // returns to the field to edit before sending.
  // Deliberately NOT auto-sending: dictation errors are common, and
  // auto-send would take away the chance to correct the text first.
  const handleDraftChange = useCallback(
    (text: string) => {
      const prevLength = draftRef.current.length;
      draftRef.current = text;
      setDraft(text);
      if (phase !== 'idle') return;
      if (text.trim().length === 0) return;
      if (text.length - prevLength <= 1) return;
      composerRef.current
        ?.querySelector<HTMLElement>('[aria-label="Send to Muse"]')
        ?.focus({ preventScroll: true });
    },
    [phase],
  );

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
      draftRef.current = '';
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
      {/* The toolkit's Page content box is a plain block container, not a
          flex column, so a bare flex:1 transcript never got constrained:
          it grew past the viewport and pushed the composer off-screen.
          This wrapper is the flex column that actually fills the page,
          so only the transcript scrolls and the composer stays pinned. */}
      <div className="mv-chat">
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

        <div className="mv-composer" ref={composerRef}>
          <InputTextView
            text={draft}
            onTextChange={handleDraftChange}
            onSend={handleSend}
            hint="Talk to Muse…"
            actionLabel="Send to Muse"
            showActionButton
            showLoader={phase === 'thinking'}
            loadingLabel="Waiting for Muse"
            inputProps={{ 'aria-label': 'Message to Muse' }}
          />
        </div>

        <div className="mv-rail">
          <ButtonRail>
            <Button title="Settings" onClick={onOpenSettings} />
            {phase === 'speaking' && (
              <Button title="Stop" onClick={handleStop} />
            )}
            {phase === 'thinking' && (
              <Button title="Cancel" onClick={handleStop} />
            )}
          </ButtonRail>
        </div>
      </div>
    </Page>
  );
}
