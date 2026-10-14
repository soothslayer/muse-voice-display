/** Home Assistant connection settings, persisted on-device. */

export interface HASettings {
  /** Base URL of Home Assistant, e.g. https://home.example.com */
  url: string;
  /** Long-lived access token (Profile > Security > Long-lived access tokens). */
  token: string;
}

const KEY = 'muse-voice-display.ha-settings';

export function loadSettings(): HASettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<HASettings>;
      return {
        url: typeof parsed.url === 'string' ? parsed.url : '',
        token: typeof parsed.token === 'string' ? parsed.token : '',
      };
    }
  } catch {
    /* corrupted storage: fall through to defaults */
  }
  return { url: '', token: '' };
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
    saveSettings({ url: normalizeUrl(url), token: token.trim() });
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
