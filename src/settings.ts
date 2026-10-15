/** Home Assistant connection settings, persisted on-device. */

export interface HASettings {
  /** Base URL of Home Assistant, e.g. https://home.example.com */
  url: string;
  /** Long-lived access token (Profile > Security > Long-lived access tokens). */
  token: string;
  /** Conversation agent entity id sent as agent_id, e.g. conversation.muse. */
  agentId: string;
}

/** Conversation agent targeted when the user hasn't picked one. */
export const DEFAULT_CONVERSATION_AGENT = 'conversation.muse';

const KEY = 'muse-voice-display.ha-settings';

function coerceAgentId(value: unknown): string {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : DEFAULT_CONVERSATION_AGENT;
}

export function loadSettings(): HASettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<HASettings>;
      return {
        url: typeof parsed.url === 'string' ? parsed.url : '',
        token: typeof parsed.token === 'string' ? parsed.token : '',
        agentId: coerceAgentId(parsed.agentId),
      };
    }
  } catch {
    /* corrupted storage: fall through to defaults */
  }
  return { url: '', token: '', agentId: DEFAULT_CONVERSATION_AGENT };
}

export function saveSettings(settings: HASettings): void {
  localStorage.setItem(KEY, JSON.stringify(settings));
}

export function isConfigured(settings: HASettings): boolean {
  return settings.url.trim().length > 0 && settings.token.trim().length > 0;
}

/** Normalize the base URL: trim whitespace and drop trailing slashes. */
export function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

/**
 * One-time setup bootstrap: if the launch URL carries
 * `?ha_url=<HA base URL>&token=<long-lived token>`, save it to localStorage
 * and strip the credentials from the visible URL. This lets the owner paste
 * the credentials on their phone (into the Meta AI app's Web Apps URL field)
 * instead of typing a 180-character token on the glasses.
 */
export function bootstrapFromUrl(): boolean {
  try {
    const q = new URLSearchParams(window.location.search);
    const url = q.get('ha_url');
    const token = q.get('token');
    if (!url || !token) return false;
    const prev = loadSettings();
    saveSettings({
      url: normalizeUrl(url),
      token: token.trim(),
      // Keep a previously chosen agent; default to Muse on first setup.
      agentId: prev.agentId || DEFAULT_CONVERSATION_AGENT,
    });
    window.history.replaceState(
      null,
      '',
      window.location.pathname + window.location.hash,
    );
    return true;
  } catch {
    return false;
  }
}
