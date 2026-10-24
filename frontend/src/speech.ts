/** Text-to-speech with the browser's built-in voices (free; Edge and Chrome have good ones). */

function englishVoice(): SpeechSynthesisVoice | undefined {
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en"));
  const preferred = ["Natural", "Google", "Microsoft"];
  for (const word of preferred) {
    const voice = voices.find((v) => v.name.includes(word));
    if (voice) return voice;
  }
  return voices[0];
}

export const ttsSupported = typeof window !== "undefined" && "speechSynthesis" in window;

export function speak(text: string, rate = 0.95): Promise<void> {
  return new Promise((resolve) => {
    // Some browsers never fire onend (e.g. when no voice is installed), so stop waiting eventually.
    const fallback = setTimeout(resolve, 2000 + text.length * 120);
    const done = () => {
      clearTimeout(fallback);
      resolve();
    };
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = englishVoice();
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? "en-US";
    utterance.rate = rate;
    utterance.onend = done;
    utterance.onerror = done;
    speechSynthesis.speak(utterance);
  });
}

// Voices load asynchronously in Chrome; touching the list early makes them ready sooner.
if (ttsSupported) speechSynthesis.getVoices();
