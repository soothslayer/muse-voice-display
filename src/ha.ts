/** Minimal client for the Home Assistant conversation API.
 *
 * The Muse conversation integration (soothslayer/ha-muse-conversation) plugs
 * into Home Assistant Assist, so POSTing recognized text to
 * /api/conversation/process returns the reply text. The conversation agent is
 * picked explicitly via agent_id (default conversation.muse), so HA's default
 * agent setting doesn't matter.
 */

import {
  DEFAULT_CONVERSATION_AGENT,
  normalizeUrl,
  type HASettings,
} from './settings';

export interface ConversationAgent {
  id: string;
  name: string;
}

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
  const agentId = settings.agentId?.trim() || DEFAULT_CONVERSATION_AGENT;

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
        agent_id: agentId,
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
    throw new Error(`The ${agentId} agent sent back an empty reply.`);
  }
  return { reply, conversationId: data.conversation_id };
}

/**
 * Check whether Home Assistant is reachable and the token is accepted.
 *
 * GET /api/ is the lightest authenticated endpoint: it returns 200 with
 * {"message":"API running."} for a valid token, 401/403 for a bad one.
 * Never throws — the caller gets a plain status to render.
 */
export type ConnectionStatus =
  | { state: 'ok' }
  | { state: 'bad-token' }
  | { state: 'unreachable'; message: string };

export async function checkConnection(
  url: string,
  token: string,
  timeoutMs = 10_000,
): Promise<ConnectionStatus> {
  const base = normalizeUrl(url);
  const trimmed = token.trim();
  if (!base || !trimmed) {
    return { state: 'unreachable', message: 'Home Assistant is not configured yet.' };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}/api/`, {
      headers: { Authorization: `Bearer ${trimmed}` },
      signal: controller.signal,
    });
    if (res.status === 401 || res.status === 403) {
      return { state: 'bad-token' };
    }
    if (!res.ok) {
      return {
        state: 'unreachable',
        message: `Home Assistant returned HTTP ${res.status}.`,
      };
    }
    return { state: 'ok' };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return {
        state: 'unreachable',
        message: `Timed out reaching Home Assistant at ${base}.`,
      };
    }
    return {
      state: 'unreachable',
      message: `Could not reach Home Assistant at ${base}. Check the URL and network.`,
    };
  } finally {
    clearTimeout(timer);
  }
}
/**
 * List the conversation agents registered in Home Assistant.
 *
 * The REST API exposes no agent listing, so this uses the websocket API at
 * /api/websocket with the `conversation/agent/list` command — the same call
 * the Home Assistant frontend makes for its own agent picker.
 */
export async function listConversationAgents(
  url: string,
  token: string,
  timeoutMs = 15_000,
): Promise<ConversationAgent[]> {
  const base = normalizeUrl(url);
  const wsUrl = `${base.replace(/^http/, 'ws')}/api/websocket`;
  return new Promise<ConversationAgent[]>((resolve, reject) => {
    let settled = false;
    let socket: WebSocket | null = null;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        socket?.close();
      } catch {
        /* already closed */
      }
      fn();
    };
    const fail = (message: string) => finish(() => reject(new Error(message)));
    const timer = setTimeout(() => {
      fail(
        `Timed out waiting for Home Assistant's conversation agent list. Check the URL and try again.`,
      );
    }, timeoutMs);
    try {
      socket = new WebSocket(wsUrl);
    } catch {
      fail(`Could not open a websocket to Home Assistant.`);
      return;
    }
    const ws = socket;
    ws.onerror = () => {
      fail(`Could not reach Home Assistant at ${base}. Check the URL and network.`);
    };
    ws.onclose = () => {
      fail(`The connection to Home Assistant closed before the agent list arrived.`);
    };
    ws.onmessage = (event) => {
      let msg: {
        type?: string;
        id?: number;
        success?: boolean;
        error?: { message?: string };
        result?: { agents?: unknown };
      };
      try {
        msg = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (msg.type === 'auth_required') {
        ws.send(JSON.stringify({ type: 'auth', access_token: token.trim() }));
      } else if (msg.type === 'auth_ok') {
        ws.send(JSON.stringify({ id: 1, type: 'conversation/agent/list' }));
      } else if (msg.type === 'auth_invalid') {
        fail('Home Assistant rejected the token. Check it in Settings.');
      } else if (msg.type === 'result' && msg.id === 1) {
        if (!msg.success) {
          fail(
            `Home Assistant refused to list conversation agents${msg.error?.message ? `: ${msg.error.message}` : '.'}`,
          );
          return;
        }
        const raw = msg.result?.agents;
        if (!Array.isArray(raw)) {
          fail('Home Assistant returned an unexpected agent list.');
          return;
        }
        const agents: ConversationAgent[] = [];
        for (const item of raw) {
          const id = (item as { id?: unknown } | null)?.id;
          if (typeof id !== 'string' || !id) continue;
          const name = (item as { name?: unknown } | null)?.name;
          agents.push({
            id,
            name: typeof name === 'string' && name ? name : id,
          });
        }
        finish(() => resolve(agents));
      }
    };
  });
}
