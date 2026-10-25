import { useEffect, useRef, useState } from "react";
import { api, fetchItem } from "../api";
import { useCountdown } from "../hooks";
import { Recorder } from "../recorder";
import { Timer } from "../components/Timer";
import { FeedbackView } from "../components/Feedback";
import type { Feedback, TaskProps } from "../types";

interface Item {
  id: string;
  prompt?: string;
  bullets?: string[];
  url?: string;
}
interface Transcript {
  text: string;
  fluency: Record<string, unknown>;
}

type Phase = "prep" | "recording" | "transcribing" | "manual" | "grading" | "done";

const LEVEL_SCORE: Record<string, number> = { A1: 0, A2: 0.2, B1: 0.4, B2: 0.6, C1: 0.8, C2: 1 };

export default function SpeakingTask({ task, onDone }: TaskProps) {
  const [item, setItem] = useState<Item>();
  const [phase, setPhase] = useState<Phase>("prep");
  const [audioUrl, setAudioUrl] = useState<string>();
  const [transcript, setTranscript] = useState<Transcript>();
  const [manualText, setManualText] = useState("");
  const [feedback, setFeedback] = useState<Feedback>();
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const recorder = useRef(new Recorder());

  useEffect(() => {
    fetchItem<Item>(task.key).then(setItem, (e) => setError(e.message));
  }, [task.key]);

  const startRecording = async () => {
    try {
      await recorder.current.start();
      setPhase("recording");
    } catch {
      setError("Could not use the microphone. Allow microphone access in the browser and try again.");
    }
  };

  const grade = (t: Transcript) => {
    setTranscript(t);
    setPhase("grading");
    api.post<Feedback>("/api/feedback/speaking", {
      task: task.key, item_id: item!.id, transcript: t.text, fluency: t.fluency,
    }).then((f) => {
      setFeedback(f);
      setPhase("done");
      onDone(f.ai ? LEVEL_SCORE[f.ai.overall_level] ?? null : null);
    }, (e) => setError(e.message));
  };

  const stopRecording = async () => {
    const blob = await recorder.current.stop();
    setAudioUrl(URL.createObjectURL(blob));
    setPhase("transcribing");
    const form = new FormData();
    form.append("task", task.key);
    form.append("audio", blob, blob.type.includes("ogg") ? "answer.ogg" : "answer.webm");
    api.upload<Transcript>("/api/transcribe", form).then(grade, (e: Error) => {
      // No speech-to-text installed: let the user type what they said instead.
      setNotice(e.message);
      setPhase("manual");
    });
  };

  const prep = useCountdown(task.prep_seconds, !!item && phase === "prep", startRecording);
  const rec = useCountdown(task.time_seconds, phase === "recording", stopRecording);

  if (error) return <div className="notice">{error}</div>;
  if (!item) return <p className="muted">Loading…</p>;

  const question = item.url ? (
    <img className="photo" src={item.url} alt="Describe this photo" />
  ) : (
    <div className="question">
      <p>{item.prompt}</p>
      {item.bullets && <ul>{item.bullets.map((b) => <li key={b}>{b}</li>)}</ul>}
    </div>
  );

  if (phase === "prep" || phase === "recording") {
    const recording = phase === "recording";
    return (
      <div className="center-stack">
        {recording ? (
          <Timer left={rec.left} total={task.time_seconds} label="● Recording" recording />
        ) : (
          <Timer left={prep.left} total={task.prep_seconds} label="Preparation" />
        )}
        <p className="prompt-label">
          {item.url ? "Speak about the photo for as long as you can." : "Speak about the topic below."}
        </p>
        {question}
        {recording ? (
          <button className="stop" onClick={stopRecording}>Stop recording</button>
        ) : (
          <button className="record" onClick={startRecording}>● Record now</button>
        )}
        {!recording && <p className="muted small">Recording starts automatically when preparation time ends.</p>}
      </div>
    );
  }
  if (phase === "manual") {
    return (
      <div>
        <div className="notice">{notice}</div>
        {audioUrl && <audio controls src={audioUrl} />}
        <p>Listen to your recording and type exactly what you said (including “um” and “uh”), to still get feedback:</p>
        <textarea className="answer-box" value={manualText} onChange={(e) => setManualText(e.target.value)} />
        <button disabled={!manualText.trim()}
          onClick={() => grade({ text: manualText, fluency: { note: "typed by the user, no audio measurements" } })}>
          Get feedback
        </button>
      </div>
    );
  }
  if (phase === "transcribing" || phase === "grading") {
    return (
      <div className="center-stack">
        <div className="spinner" />
        <p>{phase === "transcribing" ? "Turning your speech into text…" : "The local AI is grading your answer…"}</p>
        <p className="muted small">The first time can be slow while the models load.</p>
      </div>
    );
  }
  return (
    <div>
      {question}
      {audioUrl && (
        <div className="row"><span>Your recording:</span><audio controls src={audioUrl} /></div>
      )}
      <h3>What the computer heard</h3>
      <p className="your-answer">{transcript?.text || <em>(nothing)</em>}</p>
      {feedback && <FeedbackView feedback={feedback} />}
    </div>
  );
}
