import { useEffect, useRef, useState } from "react";
import { api, fetchItem } from "../api";
import { useCountdown } from "../hooks";
import { Recorder } from "../recorder";
import { Timer } from "../components/Timer";
import { FeedbackView, feedbackScore } from "../components/Feedback";
import type { Feedback, TaskProps } from "../types";

interface OptionCard {
  key?: string;
  title: string;
  details: string[];
}

interface Item {
  id: string;
  prompt?: string;
  bullets?: string[];
  url?: string;
  image_url?: string;
  scenario?: string;
  options?: OptionCard[];
  other?: OptionCard;
  other_person?: string;
  choices?: { key: string; text: string }[];
}
interface Transcript {
  text: string;
  fluency: Record<string, unknown>;
}

type Phase = "choose" | "prep" | "recording" | "transcribing" | "manual" | "grading" | "done";

function Card({ option, label, selected, onClick }: {
  option: OptionCard;
  label?: string;
  selected?: boolean;
  onClick?: () => void;
}) {
  const body = (
    <>
      {label && <div className="option-label">{label}</div>}
      <div className="option-title">{option.title}</div>
      <ul>{option.details.map((d) => <li key={d}>{d}</li>)}</ul>
    </>
  );
  return onClick ? (
    <button type="button" className={`option-card ${selected ? "chosen" : ""}`} onClick={onClick}
      aria-pressed={selected}>{body}</button>
  ) : (
    <div className={`option-card ${selected ? "chosen" : ""}`}>{body}</div>
  );
}

export default function SpeakingTask({ task, onDone }: TaskProps) {
  const [item, setItem] = useState<Item>();
  const [phase, setPhase] = useState<Phase>(task.choose_seconds ? "choose" : "prep");
  const [choice, setChoice] = useState<string>();
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
      task: task.key, item_id: item!.id, transcript: t.text, fluency: t.fluency, choice: choice ?? null,
    }).then((f) => {
      setFeedback(f);
      setPhase("done");
      onDone(feedbackScore(f));
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

  const finishChoosing = () => {
    // On the real test you must pick in time; here the first option is kept if you do not.
    setChoice((c) => c ?? item?.options?.[0]?.key);
    setPhase("prep");
  };

  const choose = useCountdown(task.choose_seconds ?? 0, !!item && phase === "choose", finishChoosing);
  const prep = useCountdown(task.prep_seconds, !!item && phase === "prep", startRecording);
  const rec = useCountdown(task.time_seconds, phase === "recording", stopRecording);

  if (error) return <div className="notice">{error}</div>;
  if (!item) return <p className="muted">Loading…</p>;

  const chosenOption = item.options?.find((o) => o.key === choice);

  const question = (
    <>
      {item.url && <img className="photo" src={item.url} alt="The picture to talk about" />}
      {item.image_url && <img className="photo drawing" src={item.image_url} alt="An unusual object" />}
      {(item.prompt || item.scenario || item.bullets) && (
        <div className="question">
          {item.scenario && <p>{item.scenario}</p>}
          {item.prompt && <p>{item.prompt}</p>}
          {item.bullets && <ul>{item.bullets.map((b) => <li key={b}>{b}</li>)}</ul>}
        </div>
      )}
      {item.choices && (
        <div className="situation-choices" role="radiogroup" aria-label="Choose one option">
          {item.choices.map((c) => (
            <label key={c.key} className={`survey-option ${choice === c.key ? "chosen" : ""}`}>
              <input type="radio" name="situation" checked={choice === c.key}
                disabled={phase !== "prep" && phase !== "recording"}
                onChange={() => setChoice(c.key)} />
              <strong>Option {c.key}:</strong> {c.text}
            </label>
          ))}
        </div>
      )}
      {chosenOption && item.other && (
        <div className="option-cards">
          <Card option={chosenOption} label="Your choice" selected />
          <Card option={item.other} label={`${item.other_person ?? "Their"}'s choice`.replace(/^your /, "Your ")} />
        </div>
      )}
    </>
  );

  if (phase === "choose") {
    return (
      <div className="center-stack">
        <Timer left={choose.left} total={task.choose_seconds ?? 0} label="Choose" />
        <p className="prompt-label">Choose the option that you prefer.</p>
        <div className="question"><p>{item.scenario}</p></div>
        <div className="option-cards">
          {item.options?.map((o) => (
            <Card key={o.key} option={o} label={`Option ${o.key}`} selected={choice === o.key}
              onClick={() => setChoice(o.key)} />
          ))}
        </div>
        <button onClick={finishChoosing} disabled={!choice}>Continue</button>
      </div>
    );
  }
  if (phase === "prep" || phase === "recording") {
    const recording = phase === "recording";
    const instruction = task.instruction ??
      (item.url ? "Speak about the photo for as long as you can." : "Speak about the topic below.");
    return (
      <div className="center-stack">
        {recording ? (
          <Timer left={rec.left} total={task.time_seconds} label="● Recording" recording />
        ) : (
          <Timer left={prep.left} total={task.prep_seconds} label="Preparation" />
        )}
        <p className="prompt-label">{instruction}</p>
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
