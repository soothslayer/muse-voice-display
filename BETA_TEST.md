# Beta test: Muse Voice for Meta Ray-Ban Display

Thanks for testing! This is a web app that lets you talk to **Muse**
(an AI assistant) from your Display glasses: you dictate a message, Muse's
reply shows on the in-lens display and is spoken aloud.

## What you need

- **Meta Ray-Ban Display glasses** — the model with the in-lens display.
  This does not work on the non-display Ray-Ban Meta.
- The **Meta AI app** on your Android phone (Play Store), updated to the
  latest version.
- **Developer Mode enabled** for the glasses: open the Meta AI app, verify
  the app version, and put the app into Developer Mode so it can load web
  apps onto the glasses.
- Internet on the glasses (they connect through your phone).

## One-time setup

1. **Add the web app.** Hanlon will send you the app URL (and/or a QR
   code). Either:
   - Scan the QR code — it opens the Meta AI app's Web Apps section and
     asks to add the URL, or
   - In the Meta AI app, go to Settings → App Connections → Web Apps and
     add the URL manually.
2. **Open Muse Voice** on your glasses.
3. **Open Settings** (the Settings button on the main screen) and enter:
   - Home Assistant URL: ← Hanlon provides this
   - Long-lived access token: ← Hanlon provides this
4. Tap **Save**, then **Done**.

The URL and token stay on the glasses; nothing else needs your phone.

## How to test

1. Open **Muse Voice** on the glasses.
2. Move focus to the **"Talk to Muse…"** field (D-pad / swipe, then
   pinch or Select). The glasses' **voice composer** should open.
3. **Dictate your message**, confirm it — the text appears in the field
   and sends.
4. Muse's reply appears on the display **and is spoken aloud**.
5. Try a follow-up question — the app keeps the conversation context.

## Please report back

- Did the voice composer open when you focused the field?
- Could you hear the spoken reply? How was the voice quality?
- Was the reply text readable on the display?
- Could you reach everything with D-pad/swipe + pinch? Anything stuck?
- Any error messages — please note the **exact wording**.

## Troubleshooting

| Symptom | Try this |
|---|---|
| Web app won't load on the glasses | Confirm Developer Mode is on, the Meta AI app is updated, and the URL is HTTPS |
| "Home Assistant rejected the token" | The token expired or was mistyped — ask Hanlon for a fresh one |
| "Could not reach Home Assistant" | The glasses can't reach Hanlon's server from your network — tell him |
| "Muse sent back an empty reply" | Muse's backend didn't answer — tell Hanlon |
| No voice composer opens | Make sure you're focusing the text field (not just looking at it), then pinch/Select |
| No spoken reply, but text shows | Speech output isn't available in the glasses browser — report it, the text still works |
