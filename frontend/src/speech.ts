/** Text-to-speech with the browser's built-in voices (free; Edge and Chrome have good ones). */

export const ttsSupported = typeof window !== "undefined" && "speechSynthesis" in window;

export interface VoiceChoice {
  voice?: SpeechSynthesisVoice;
  pitch: number;
}

// Browsers do not say whether a voice is male or female, so guess from common voice names.
const FEMALE = /female|woman|aria|jenny|michelle|emma|ava|sonia|libby|natasha|clara|zira|hazel|susan|samantha|karen|moira|tessa|fiona|victoria|catherine|linda|nancy|sara|jane|amber|ashley|cora|elizabeth|monica|serena|heera|google us english/i;
const MALE = /\bmale\b|guy|christopher|eric|roger|steffan|andrew|brian|ryan|thomas|william|liam|david|mark|george|james|daniel|alex|fred|rishi|aaron|arthur|oliver|davis|jacob|jason|tony|brandon/i;

function genderOf(voice: SpeechSynthesisVoice): "female" | "male" | "unknown" {
  if (FEMALE.test(voice.name)) return "female";
  if (MALE.test(voice.name)) return "male";
  return "unknown";
}

/** English voices, best first: North American accents and natural-sounding voices first. */
function rankedVoices(): SpeechSynthesisVoice[] {
  const score = (v: SpeechSynthesisVoice) =>
    (/en[-_](CA|US)/i.test(v.lang) ? 4 : 0) + (/natural|online|google/i.test(v.name) ? 2 : 0);
  return speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith("en"))
    .sort((a, b) => score(b) - score(a));
}

/** Voices load asynchronously in some browsers; wait for them briefly. */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!ttsSupported) return Promise.resolve([]);
  const now = rankedVoices();
  if (now.length) return Promise.resolve(now);
  return new Promise((resolve) => {
    const finish = () => resolve(rankedVoices());
    speechSynthesis.addEventListener("voiceschanged", finish, { once: true });
    setTimeout(finish, 1500);
  });
}

/** Give each speaker a different voice, matching gender when possible. */
export function assignVoices(
  speakers: Record<string, { gender?: string }>,
  voices: SpeechSynthesisVoice[],
): Record<string, VoiceChoice> {
  const used = new Set<SpeechSynthesisVoice>();
  const result: Record<string, VoiceChoice> = {};
  Object.entries(speakers).forEach(([id, speaker], index) => {
    const wanted = speaker.gender === "male" ? "male" : "female";
    const voice =
      voices.find((v) => !used.has(v) && genderOf(v) === wanted) ??
      voices.find((v) => !used.has(v) && genderOf(v) === "unknown") ??
      voices.find((v) => !used.has(v)) ??
      voices[0];
    if (voice) used.add(voice);
    // When voices run out and one is shared, a different pitch still tells the speakers apart.
    const shared = voice !== undefined && Object.values(result).some((r) => r.voice === voice);
    const pitch = shared ? (wanted === "male" ? 0.8 : 1.2) : 1;
    result[id] = { voice, pitch: voices.length ? pitch : wanted === "male" ? 0.8 : 1.15 + index * 0.05 };
  });
  return result;
}

export function speak(text: string, options: { voice?: SpeechSynthesisVoice; pitch?: number; rate?: number } = {}): Promise<void> {
  return new Promise((resolve) => {
    // Some browsers never fire onend (e.g. when no voice is installed), so stop waiting eventually.
    const fallback = setTimeout(resolve, 2000 + text.length * 120);
    const done = () => {
      clearTimeout(fallback);
      resolve();
    };
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = options.voice ?? rankedVoices()[0];
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? "en-US";
    utterance.rate = options.rate ?? 0.95;
    utterance.pitch = options.pitch ?? 1;
    utterance.onend = done;
    utterance.onerror = done;
    speechSynthesis.speak(utterance);
  });
}

export interface ScriptLine {
  speaker: string;
  text: string;
}

/**
 * Read a conversation aloud, one line after another. Long lines are split into sentences,
 * because some browsers stop speaking in the middle of very long texts.
 * Returns a function that stops playback.
 */
export function playScript(
  lines: ScriptLine[],
  voices: Record<string, VoiceChoice>,
  onLine: (index: number) => void,
  onEnd: () => void,
): () => void {
  let stopped = false;
  (async () => {
    for (let i = 0; i < lines.length && !stopped; i++) {
      onLine(i);
      const sentences = lines[i].text.split(/(?<=[.!?])\s+/);
      for (const sentence of sentences) {
        if (stopped) break;
        await speak(sentence, voices[lines[i].speaker] ?? {});
      }
      if (!stopped) await new Promise((r) => setTimeout(r, 350));
    }
    if (!stopped) onEnd();
  })();
  return () => {
    stopped = true;
    speechSynthesis.cancel();
  };
}

// Voices load asynchronously in Chrome; touching the list early makes them ready sooner.
if (ttsSupported) speechSynthesis.getVoices();
