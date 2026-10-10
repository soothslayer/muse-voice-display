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
