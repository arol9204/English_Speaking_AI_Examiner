import { useEffect, useState, type ComponentType } from "react";
import { api } from "./api";
import { loadHistory, saveAttempt, type Attempt } from "./history";
import { formatTime } from "./components/Timer";
import type { Exam, Level, Skill, Status, Task, TaskProps } from "./types";
import ReadAndSelect from "./tasks/ReadAndSelect";
import FillInTheBlanks from "./tasks/FillInTheBlanks";
import ReadAndComplete from "./tasks/ReadAndComplete";
import ListenAndType from "./tasks/ListenAndType";
import WritingTask from "./tasks/WritingTask";
import SpeakingTask from "./tasks/SpeakingTask";
import InteractiveSpeaking from "./tasks/InteractiveSpeaking";
import ReadingPart from "./tasks/ReadingPart";
import ListeningPart from "./tasks/ListeningPart";

/** Which component shows each kind of screen (the catalog's `screen` field). */
const SCREENS: Record<string, ComponentType<TaskProps>> = {
  read_and_select: ReadAndSelect,
  fill_in_the_blanks: FillInTheBlanks,
  read_and_complete: ReadAndComplete,
  listen_and_type: ListenAndType,
  writing: WritingTask,
  speaking: SpeakingTask,
  interactive_speaking: InteractiveSpeaking,
  mc_reading: ReadingPart,
  mc_listening: ListeningPart,
};

// DET tasks whose difficulty adapts on the real test; in practice the user picks the level.
const LEVELED = new Set(["read_and_select", "fill_in_the_blanks", "read_and_complete", "listen_and_type"]);

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onChange = () => {
      setHash(window.location.hash);
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash.replace(/^#\/?/, "");
}

function timeText(task: Task) {
  if (task.time_note) return task.time_note;
  const parts = [];
  if (task.choose_seconds) parts.push(`${formatTime(task.choose_seconds)} choose`);
  if (task.prep_seconds) parts.push(`${formatTime(task.prep_seconds)} prep`);
  parts.push(formatTime(task.time_seconds));
  if (task.part2_seconds) parts.push(`+ ${formatTime(task.part2_seconds)}`);
  return parts.join(" · ");
}

function stats(attempts: Attempt[]) {
  const scored = attempts.filter((a) => a.score !== null);
  const avg = scored.length ? scored.reduce((s, a) => s + a.score!, 0) / scored.length : null;
  return { count: attempts.length, avg };
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

function Monogram({ exam }: { exam: Exam }) {
  return <span className={`monogram monogram-${exam.key}`} aria-hidden="true">{exam.short_name}</span>;
}

function Landing({ exams, tasks, status, history }: {
  exams: Exam[];
  tasks: Task[];
  status?: Status;
  history: Attempt[];
}) {
  const examOf = Object.fromEntries(tasks.map((t) => [t.key, t.exam]));
  return (
    <>
      <section className="landing-intro">
        <h1>Which test are you preparing for?</h1>
        <p className="muted">
          Every question type is timed like the real test. Reading and listening are scored instantly;
          writing and speaking are graded by a free AI examiner that runs on your computer.
        </p>
      </section>
      <StatusBar status={status} />
      <div className="exam-grid">
        {exams.map((exam) => {
          const { count } = stats(history.filter((a) => examOf[a.task] === exam.key));
          const body = (
            <>
              <div className="exam-card-head">
                <Monogram exam={exam} />
                <h2>{exam.name}</h2>
              </div>
              <p className="muted">{exam.summary}</p>
              {exam.facts && (
                <dl className="facts">
                  {exam.facts.map((f) => (
                    <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>
                  ))}
                </dl>
              )}
              <div className="card-meta">
                {exam.available ? (
                  <>
                    <span>{exam.available_task_count} of {exam.task_count} question types ready</span>
                    {count > 0 && <span>{count} practised</span>}
                  </>
                ) : (
                  <span className="soon">Coming later</span>
                )}
              </div>
            </>
          );
          return exam.available ? (
            <a key={exam.key} className="exam-card" href={`#/exam/${exam.key}`}>{body}</a>
          ) : (
            <div key={exam.key} className="exam-card disabled">{body}</div>
          );
        })}
      </div>
    </>
  );
}

function TaskCard({ task, history }: { task: Task; history: Attempt[] }) {
  const { count, avg } = stats(history.filter((a) => a.task === task.key));
  const body = (
    <>
      <div className="card-title">{task.name}</div>
      <div className="card-summary">{task.summary}</div>
      <div className="card-meta">
        <span>{timeText(task)}</span>
        {task.available ? (
          count > 0 && <span>{count} done{avg !== null ? ` · avg ${Math.round(avg * 100)}%` : ""}</span>
        ) : (
          <span className="soon">Coming soon</span>
        )}
      </div>
    </>
  );
  return task.available ? (
    <a className="card" href={`#/task/${task.key}`}>{body}</a>
  ) : (
    <div className="card disabled">{body}</div>
  );
}

function ExamPage({ exam, tasks, status, history }: {
  exam: Exam;
  tasks: Task[];
  status?: Status;
  history: Attempt[];
}) {
  const skills: Skill[] = exam.skills ?? ["Reading", "Listening", "Writing", "Speaking"];
  return (
    <div className="exam-page">
      <a href="#/" className="back">← All tests</a>
      <div className="exam-header">
        <Monogram exam={exam} />
        <div>
          <h1>{exam.name}</h1>
          <p className="muted">{exam.summary}</p>
        </div>
      </div>
      {exam.facts && (
        <dl className="facts wide">
          {exam.facts.map((f) => <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}
        </dl>
      )}
      <div className="full-test">
        <div>
          <h2>Full test</h2>
          <p className="muted">
            Take the whole test in one sitting, in the real order and timing, with a score estimate at the end.
          </p>
        </div>
        <span className="soon">Coming soon</span>
      </div>
      <h2 className="section-title">Practise by skill</h2>
      <StatusBar status={status} />
      <div className="skills">
        {skills.map((skill) => (
          <section key={skill} className="skill">
            <div>
              <h3>{skill}</h3>
              {exam.skill_times?.[skill] && <p className="muted small">{exam.skill_times[skill]} on the real test</p>}
            </div>
            {tasks.filter((t) => t.subscore === skill).map((t) => <TaskCard key={t.key} task={t} history={history} />)}
          </section>
        ))}
      </div>
    </div>
  );
}

function TaskPage({ task, exam, status, onAttempt }: {
  task: Task;
  exam?: Exam;
  status?: Status;
  onAttempt: (a: Attempt) => void;
}) {
  const [level, setLevel] = useState<Level>("medium");
  const [attempt, setAttempt] = useState(0);
  const [done, setDone] = useState(false);
  const Component = SCREENS[task.screen];
  const started = attempt > 0;
  const examLink = `#/exam/${task.exam}`;

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
    <div className={`task-page ${task.screen === "mc_reading" ? "wide" : ""}`}>
      <div className="task-header">
        <a href={examLink} className="back">← {exam?.name ?? "Back"}</a>
        <h1>{task.name}</h1>
        <span className="tag">{task.subscore}</span>
      </div>
      {!started ? (
        <div className="intro">
          <p>{task.summary}</p>
          <dl>
            <dt>Time</dt><dd>{timeText(task)}</dd>
            <dt>On the real test</dt><dd>{task.count}</dd>
            {task.word_range && (<><dt>Length</dt><dd>{task.word_range[0]}–{task.word_range[1]} words</dd></>)}
            {task.criteria && (
              <><dt>Graded on</dt><dd>{task.criteria.map((c) => exam?.criteria_names?.[c] ?? c).join(", ")}</dd></>
            )}
          </dl>
          <h3>Tips</h3>
          <ul>{task.tips.map((t) => <li key={t}>{t}</li>)}</ul>
          {task.needs_photos && status?.photos === 0 && (
            <div className="notice">
              Add some photos (.jpg or .png) to the <code>content/photos/</code> folder first. Use real photos of
              people, animals or everyday scenes, like the real test.
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
              <a href={examLink} className="button secondary">Back to {exam?.short_name ?? "the test"}</a>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function App() {
  const route = useHashRoute();
  const [exams, setExams] = useState<Exam[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [status, setStatus] = useState<Status>();
  const [history, setHistory] = useState<Attempt[]>(loadHistory);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const offline = () => setError("Cannot reach the backend. Is it running?");
    api.get<Exam[]>("/api/exams").then(setExams, offline);
    api.get<Task[]>("/api/tasks").then(setTasks, offline);
    api.get<Status>("/api/status").then(setStatus, () => undefined);
  }, []);

  const [view, key] = route.split("/");
  const task = view === "task" ? tasks.find((t) => t.key === key) : undefined;
  const exam = exams.find((e) => e.key === (task ? task.exam : view === "exam" ? key : undefined));

  let page;
  if (task) {
    page = (
      <TaskPage key={task.key} task={task} exam={exam} status={status} onAttempt={(a) => {
        saveAttempt(a);
        setHistory(loadHistory());
      }} />
    );
  } else if (exam?.available) {
    page = <ExamPage exam={exam} tasks={tasks.filter((t) => t.exam === exam.key)} status={status} history={history} />;
  } else {
    page = <Landing exams={exams} tasks={tasks} status={status} history={history} />;
  }

  return (
    <div className="app">
      <header>
        <a href="#/" className="logo">AI English Examiner</a>
        <span className="muted">Practice for international English tests</span>
      </header>
      <main>
        {error && <div className="notice bad">{error}</div>}
        {page}
      </main>
      <footer className="muted small">
        Not affiliated with Duolingo or with Paragon Testing Enterprises (CELPIP). Question formats follow the
        DET Question Guide (2026) and the CELPIP Guidebook for Test Takers (2025).
      </footer>
    </div>
  );
}
