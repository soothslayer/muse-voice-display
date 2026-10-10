/** Spoken replies via the platform speech synthesizer.
 *
 * On the glasses this routes to the glasses speakers. Desktop browsers speak
 * through the computer. Verify voice availability on-device; the UI always
 * shows the reply text as well.
 */

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === 'undefined') return null;
  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  // Prefer a US English voice; otherwise take the default/first.
  return (
    voices.find((v) => v.lang.toLowerCase().startsWith('en-us')) ??
    voices.find((v) => v.lang.toLowerCase().startsWith('en')) ??
    voices.find((v) => v.default) ??
    voices[0]
  );
}

/**
 * Speak text aloud. Resolves when speaking finishes or is stopped.
 * Rejects only if the synthesizer itself is unavailable.
 */
export function speak(text: string): Promise<void> {
  stopSpeaking();
  return new Promise((resolve, reject) => {
    if (typeof speechSynthesis === 'undefined') {
      reject(new Error('Speech synthesis is not available.'));
      return;
    }
    // Some platforms populate voices asynchronously; a warm-up read helps.
    speechSynthesis.getVoices();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = 1;
    utterance.onend = () => resolve();
    utterance.onerror = (event) => {
      // "interrupted" / "canceled" happen on stopSpeaking(); not failures.
      if (event.error === 'interrupted' || event.error === 'canceled') {
        resolve();
      } else {
        reject(new Error(`Speech failed: ${event.error}`));
      }
    };
    speechSynthesis.speak(utterance);
  });
}

/** Stop any in-progress speech immediately. */
export function stopSpeaking(): void {
  if (typeof speechSynthesis !== 'undefined') {
    speechSynthesis.cancel();
  }
}

/** True while the synthesizer is currently speaking. */
export function isSpeaking(): boolean {
  return (
    typeof speechSynthesis !== 'undefined' && speechSynthesis.speaking
  );
}
