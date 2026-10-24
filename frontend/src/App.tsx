import { useEffect, useState, type ComponentType } from "react";
import { api } from "./api";
import { loadHistory, saveAttempt, type Attempt } from "./history";
import { formatTime } from "./components/Timer";
import type { Level, Status, Task, TaskProps } from "./types";
import ReadAndSelect from "./tasks/ReadAndSelect";
import FillInTheBlanks from "./tasks/FillInTheBlanks";
import ReadAndComplete from "./tasks/ReadAndComplete";
import ListenAndType from "./tasks/ListenAndType";
import WritingTask from "./tasks/WritingTask";
import SpeakingTask from "./tasks/SpeakingTask";

const COMPONENTS: Record<string, ComponentType<TaskProps>> = {
  read_and_select: ReadAndSelect,
  fill_in_the_blanks: FillInTheBlanks,
  read_and_complete: ReadAndComplete,
  listen_and_type: ListenAndType,
  write_about_the_photo: WritingTask,
  interactive_writing: WritingTask,
  writing_sample: WritingTask,
  speak_about_the_photo: SpeakingTask,
  read_then_speak: SpeakingTask,
  speaking_sample: SpeakingTask,
};

// Tasks whose difficulty adapts on the real test; in practice the user picks the level.
const LEVELED = new Set(["read_and_select", "fill_in_the_blanks", "read_and_complete", "listen_and_type"]);
const SUBSCORES = ["Reading", "Listening", "Writing", "Speaking"] as const;

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash.replace(/^#\/?/, "");
}

function timeText(task: Task) {
  if (task.time_note) return task.time_note;
  const parts = [];
  if (task.prep_seconds) parts.push(`${formatTime(task.prep_seconds)} prep`);
  parts.push(formatTime(task.time_seconds));
  if (task.part2_seconds) parts.push(`+ ${formatTime(task.part2_seconds)}`);
  return parts.join(" · ");
}

function StatusBar({ status }: { status?: Status }) {
  if (!status) return null;
  const pill = (ok: boolean, label: string, hint: string | null) => (
    <span className={`pill ${ok ? "ok" : "off"}`} title={hint ?? ""}>
      {ok ? "●" : "○"} {label}{!ok && hint ? `: ${hint}` : ""}
    </span>
  );
  return (
    <div className="status-bar">
      {pill(status.llm.available, `AI feedback (${status.llm.model})`, status.llm.reason)}
      {pill(status.stt.available, "Speech-to-text", status.stt.reason)}
      {pill(status.photos > 0, `${status.photos} photo${status.photos === 1 ? "" : "s"}`, status.photos ? null : "add photos to content/photos/")}
    </div>
  );
}

function Home({ tasks, status, history }: { tasks: Task[]; status?: Status; history: Attempt[] }) {
  return (
    <>
      <StatusBar status={status} />
      <div className="skills">
        {SUBSCORES.map((subscore) => (
          <section key={subscore} className="skill">
            <h2>{subscore}</h2>
            {tasks.filter((t) => t.subscore === subscore).map((t) => {
              const attempts = history.filter((a) => a.task === t.key);
              const scored = attempts.filter((a) => a.score !== null);
              const avg = scored.length ? scored.reduce((s, a) => s + a.score!, 0) / scored.length : null;
              const card = (
                <>
                  <div className="card-title">{t.name}</div>
                  <div className="card-summary">{t.summary}</div>
                  <div className="card-meta">
                    <span>{timeText(t)}</span>
                    {t.available ? (
                      attempts.length > 0 && (
                        <span>{attempts.length} done{avg !== null ? ` · avg ${Math.round(avg * 100)}%` : ""}</span>
                      )
                    ) : (
                      <span className="soon">Coming soon</span>
                    )}
                  </div>
                </>
              );
              return t.available ? (
                <a key={t.key} className="card" href={`#/task/${t.key}`}>{card}</a>
              ) : (
                <div key={t.key} className="card disabled">{card}</div>
              );
            })}
          </section>
        ))}
      </div>
    </>
  );
}

function TaskPage({ task, status, onAttempt }: {
  task: Task;
  status?: Status;
  onAttempt: (a: Attempt) => void;
}) {
  const [level, setLevel] = useState<Level>("medium");
  const [attempt, setAttempt] = useState(0);
  const [done, setDone] = useState(false);
  const Component = COMPONENTS[task.key];
  const started = attempt > 0;

  const finish = (score: number | null) => {
    setDone(true);
    onAttempt({ task: task.key, level: LEVELED.has(task.key) ? level : undefined, score,
                at: new Date().toISOString() });
  };
  const next = () => {
    setDone(false);
    setAttempt((a) => a + 1);
  };

  return (
    <div className="task-page">
      <div className="task-header">
        <a href="#/" className="back">← All questions</a>
        <h1>{task.name}</h1>
        <span className="tag">{task.subscore}</span>
      </div>
      {!started ? (
        <div className="intro">
          <p>{task.summary}</p>
          <dl>
            <dt>Time</dt><dd>{timeText(task)}</dd>
            <dt>On the real test</dt><dd>{task.count}</dd>
            {task.criteria && (<><dt>Graded on</dt><dd>{task.criteria.join(", ")}</dd></>)}
          </dl>
          <h3>Tips from the official guide</h3>
          <ul>{task.tips.map((t) => <li key={t}>{t}</li>)}</ul>
          {task.needs_photos && status?.photos === 0 && (
            <div className="notice">
              Add some photos (.jpg or .png) to the <code>content/photos/</code> folder first. Use real photos of
              people, animals or objects, like the real test.
            </div>
          )}
          {LEVELED.has(task.key) && (
            <div className="row">
              <span>Difficulty:</span>
              {(["easy", "medium", "hard"] as Level[]).map((l) => (
                <button key={l} className={level === l ? "chip active" : "chip"} onClick={() => setLevel(l)}>{l}</button>
              ))}
            </div>
          )}
          <button className="start" onClick={next}>Start</button>
        </div>
      ) : (
        <>
          <div className="task-body">
            <Component key={attempt} task={task} level={level} onDone={finish} />
          </div>
          {done && (
            <div className="row actions">
              <button onClick={next}>Next question</button>
              <a href="#/" className="button secondary">Back to all questions</a>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function App() {
  const route = useHashRoute();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [status, setStatus] = useState<Status>();
  const [history, setHistory] = useState<Attempt[]>(loadHistory);
  const [error, setError] = useState<string>();

  useEffect(() => {
    api.get<Task[]>("/api/tasks").then(setTasks, () => setError("Cannot reach the backend. Is it running?"));
    api.get<Status>("/api/status").then(setStatus, () => undefined);
  }, []);

  const taskKey = route.startsWith("task/") ? route.slice(5) : null;
  const task = tasks.find((t) => t.key === taskKey);

  return (
    <div className="app">
      <header>
        <a href="#/" className="logo">DET Practice</a>
        <span className="muted">Practice for the Duolingo English Test</span>
      </header>
      <main>
        {error && <div className="notice bad">{error}</div>}
        {task ? (
          <TaskPage key={task.key} task={task} status={status} onAttempt={(a) => {
            saveAttempt(a);
            setHistory(loadHistory());
          }} />
        ) : (
          <Home tasks={tasks} status={status} history={history} />
        )}
      </main>
      <footer className="muted small">
        Not affiliated with Duolingo. Question formats follow the public DET Question Guide (2026).
      </footer>
    </div>
  );
}
