/** Minimal client for the Home Assistant conversation API.
 *
 * The Muse conversation integration (soothslayer/ha-muse-conversation) plugs
 * into Home Assistant Assist, so POSTing recognized text to
 * /api/conversation/process returns Muse's spoken reply text.
 *
 * Requires the default conversation agent in Home Assistant to be Muse
 * (Settings > Voice assistants > Assist > Conversation agent).
 */

import { normalizeUrl, type HASettings } from './settings';

interface ConversationApiResponse {
  response?: {
    speech?: {
      plain?: {
        speech?: string;
      };
    };
  };
  conversation_id?: string;
}

/**
 * Send one user turn to Muse via Home Assistant and return the reply text.
 * Throws with a human-readable message on transport or API errors.
 */
export async function askMuse(
  settings: HASettings,
  text: string,
  conversationId?: string,
): Promise<{ reply: string; conversationId?: string }> {
  const base = normalizeUrl(settings.url);
  const token = settings.token.trim();
  if (!base || !token) {
    throw new Error('Home Assistant is not configured yet.');
  }

  let res: Response;
  try {
    res = await fetch(`${base}/api/conversation/process`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        language: 'en',
        conversation_id: conversationId,
      }),
    });
  } catch (err) {
    throw new Error(
      `Could not reach Home Assistant at ${base}. Check the URL and network.`,
      { cause: err },
    );
  }

  if (res.status === 401 || res.status === 403) {
    throw new Error('Home Assistant rejected the token. Check it in Settings.');
  }
  if (!res.ok) {
    throw new Error(`Home Assistant returned HTTP ${res.status}.`);
  }

  const data = (await res.json()) as ConversationApiResponse;
  const reply = data?.response?.speech?.plain?.speech?.trim();
  if (!reply) {
    throw new Error('Muse sent back an empty reply.');
  }
  return { reply, conversationId: data.conversation_id };
}
