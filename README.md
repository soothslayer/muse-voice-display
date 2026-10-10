# Muse Voice for Meta Ray-Ban Display

Talk to Muse from Meta Ray-Ban Display glasses. A web app built with Meta's
official UI toolkit (`@wearables-ui-toolkit/mrbd`), designed to be built and
QA'd **without the hardware** using the Display Simulator.

## How it works

The glasses can't run the native iOS app, so this is a new client for the
same backend you already have working:

```
Glasses web app ──text──▶ Home Assistant /api/conversation/process
                              │  (muse_conversation integration = Muse)
                          ◀──reply text──
Glasses: show reply on display + speak via speechSynthesis
```

- **Voice input:** focusing the message field opens the glasses'
  handwriting/voice composer (system-level dictation, no SDK needed).
  On desktop it degrades to a normal text field, so the Simulator works too.
- **Voice output:** `speechSynthesis` speaks replies through the glasses
  speakers. Reply text is always shown on screen as well.
- **No new backend code.** It reuses your `ha-muse-conversation` stack.

## Prerequisites

1. Home Assistant with the `muse_conversation` integration installed and
   **Muse set as the default conversation agent**
   (Settings → Voice assistants → Assist → Conversation agent).
2. A Home Assistant long-lived access token
   (your HA profile → Security → Long-lived access tokens).
3. HTTPS access to your HA instance from the glasses' network
   (Nabu Casa, Tailscale, or reverse proxy — same as the HA companion app needs).

## Develop

```sh
npm install
npm run dev        # local dev server
npm run build      # production build (tsc + vite)
```

## Preview in the Display Simulator (no glasses needed)

1. Install the **Meta Ray-Ban Display Simulator** from the Chrome Web Store.
2. Run the production preview:
   ```sh
   npm run preview -- --host 127.0.0.1 --port 4173
   ```
3. Open http://127.0.0.1:4173/, click the extension icon to toggle the
   600×600 simulator frame, and QA: D-pad focus order, overflow, contrast.
   The simulator's QA checklist flags viewport/favicon/focus problems.

## Put it on glasses

1. `npm run build` and host `dist/` at a public HTTPS URL
   (Vercel, Netlify, etc.).
2. In the Simulator, use **View on Glasses QR** to generate a deep link and
   add the web app to the glasses.
3. Open Settings in the app once and enter the HA URL + token
   (stored in localStorage on the glasses).

## Design constraints followed

- 600×600 viewport via the simulator; layout derives from available space,
  no hardcoded device dimensions.
- Dark-only UI — black is transparent on the additive display.
- Every action reachable by D-pad (arrow keys move focus, Select activates);
  no pointer-only or touchscreen-only interactions.
- Visible focus styles come from the toolkit components.
- No secrets bundled: the HA token is entered on-device and stays in
  localStorage.

## Verification status

- `tsc -b` and `vite build` pass.
- Render smoke test in headless Chromium: pending (checked before release).
- On-device checks still needed: voice composer opening from the field,
  `speechSynthesis` voice availability, and WebMCP (not yet implemented —
  see below).

## Possible next step: WebMCP

Meta's WebMCP lets the wearer drive the app by speaking to Meta AI
("Hey Meta, ask Muse …") instead of dictating into a field. It is additive:
the app stays fully D-pad usable without it. The toolkit skill
`ai-glasses-webapp-webmcp` covers the tool registration.
