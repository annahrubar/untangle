"use client";

import { useEffect, useMemo, useState } from "react";
import {
  KnotIcon,
  ClockIcon,
  CheckIcon,
  SparkIcon,
  TangleIcon,
  TrashIcon,
  CalendarIcon,
  FlagIcon,
  HistoryIcon,
} from "@/components/Icons";
import type { Task, ParsedTask, Priority, RecommendItem } from "@/lib/types";

type Filter = "all" | "active" | "done";
type SortBy = "recent" | "deadline" | "priority";

function formatDeadline(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (isNaN(date.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / dayMs
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) {
    return target.toLocaleDateString("en-US", { weekday: "long" });
  }
  return target.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

type SelectableTask = {
  title: string;
  priority: Priority;
  deadline: string | null;
  selected: boolean;
  subtasks?: SelectableTask[];
};

type PreviewState = {
  rawInput: string;
  tasks: SelectableTask[];
};

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachItems, setCoachItems] = useState<RecommendItem[] | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);

  // Initial load
  useEffect(() => {
    fetch("/api/tasks")
      .then((r) => r.json())
      .then((d) => setTasks(d.tasks ?? []))
      .catch(() => {});
  }, []);

  const counts = useMemo(() => {
    const flat = tasks.flatMap((t) => [t, ...(t.subtasks ?? [])]);
    return {
      all: flat.length,
      active: flat.filter((t) => !t.done).length,
      done: flat.filter((t) => t.done).length,
    };
  }, [tasks]);

  function untangle() {
    if (!text.trim() || busy) return;
    setBusy(true);
    fetch("/api/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.tasks)) {
          const tasksWithSelected = d.tasks.map((t: ParsedTask) => ({
            ...t,
            selected: true,
            subtasks: (t.subtasks ?? []).map((s) => ({
              ...s,
              selected: true,
            })),
          }));
          setPreview({ rawInput: text, tasks: tasksWithSelected });
        }
      })
      .catch(() => {})
      .finally(() => setBusy(false));
  }

  function togglePreviewParent(i: number) {
    if (!preview) return;
    const next = [...preview.tasks];
    next[i] = { ...next[i], selected: !next[i].selected };
    // If parent unchecked, also uncheck subtasks
    if (!next[i].selected && next[i].subtasks) {
      next[i].subtasks = next[i].subtasks.map((s) => ({ ...s, selected: false }));
    }
    setPreview({ ...preview, tasks: next });
  }

  function togglePreviewSub(i: number, j: number) {
    if (!preview) return;
    const next = [...preview.tasks];
    const subs = [...(next[i].subtasks ?? [])];
    subs[j] = { ...subs[j], selected: !subs[j].selected };
    next[i] = { ...next[i], subtasks: subs };
    setPreview({ ...preview, tasks: next });
  }

  function discardPreview() {
    setPreview(null);
    setText("");
  }

  function savePreview() {
    if (!preview) return;
    const selected = preview.tasks
      .filter((t) => t.selected)
      .map((t) => ({
        title: t.title,
        priority: t.priority,
        deadline: t.deadline,
        subtasks: (t.subtasks ?? [])
          .filter((s) => s.selected)
          .map((s) => ({
            title: s.title,
            priority: s.priority,
            deadline: s.deadline,
          })),
      }));

    if (selected.length === 0) {
      discardPreview();
      return;
    }

    fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawInput: preview.rawInput, selected }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.tasks)) {
          setTasks((cur) => [...d.tasks, ...cur]);
        }
        discardPreview();
      })
      .catch(() => {});
  }

  function toggleDone(id: string, currentDone: boolean) {
    fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !currentDone }),
    })
      .then((r) => r.json())
      .then(() => {
        setTasks((cur) =>
          cur.map((t) => {
            if (t.id === id) return { ...t, done: !currentDone };
            return {
              ...t,
              subtasks: t.subtasks?.map((s) =>
                s.id === id ? { ...s, done: !currentDone } : s
              ),
            };
          })
        );
      })
      .catch(() => {});
  }

  function deleteTask(id: string) {
    fetch(`/api/tasks/${id}`, { method: "DELETE" })
      .then(() => {
        setTasks((cur) =>
          cur
            .filter((t) => t.id !== id)
            .map((t) => ({
              ...t,
              subtasks: t.subtasks?.filter((s) => s.id !== id),
            }))
        );
      })
      .catch(() => {});
  }

  function startEdit(task: Task) {
    setEditingId(task.id);
    setEditText(task.title);
  }

  function saveEdit(id: string) {
    const newTitle = editText.trim();
    setEditingId(null);
    if (!newTitle) return;
    fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    })
      .then(() => {
        setTasks((cur) =>
          cur.map((t) => {
            if (t.id === id) return { ...t, title: newTitle };
            return {
              ...t,
              subtasks: t.subtasks?.map((s) =>
                s.id === id ? { ...s, title: newTitle } : s
              ),
            };
          })
        );
      })
      .catch(() => {});
  }

  function openCoach() {
    setCoachOpen(true);
    setCoachLoading(true);
    fetch("/api/recommend", { method: "POST" })
      .then((r) => r.json())
      .then((d) => setCoachItems(d.items ?? []))
      .catch(() => setCoachItems([]))
      .finally(() => setCoachLoading(false));
  }

  const filtered = useMemo(() => {
    if (filter === "all") return tasks;
    if (filter === "active") {
      return tasks
        .filter((t) => !t.done || (t.subtasks ?? []).some((s) => !s.done))
        .map((t) => ({
          ...t,
          subtasks: t.subtasks?.filter((s) => !s.done),
        }));
    }
    return tasks
      .filter((t) => t.done || (t.subtasks ?? []).some((s) => s.done))
      .map((t) => ({
        ...t,
        subtasks: t.subtasks?.filter((s) => s.done),
      }));
  }, [tasks, filter]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sortBy === "deadline") {
      list.sort((a, b) => {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      });
    } else if (sortBy === "priority") {
      const order: Record<Priority, number> = { high: 3, medium: 2, low: 1 };
      list.sort((a, b) => order[b.priority] - order[a.priority]);
    }
    return list;
  }, [filtered, sortBy]);

  return (
    <>
      {/* Top bar */}
      <div className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <KnotIcon style={{ color: "var(--accent)" }} />
            <span>untangle</span>
          </div>
          <div className="avatar" title="You">
            A
          </div>
        </div>
      </div>

      <main className="page">
        {/* Hero */}
        <section className="hero">
          <h1>Brain-dump in. Plan out.</h1>
          <p>Type like you&apos;d text a friend. We turn the chaos into a clean list.</p>
        </section>

        {/* Brain-dump input */}
        <div className="dump-wrap">
          <textarea
            className="dump"
            placeholder="Type whatever's on your mind..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                untangle();
              }
            }}
            rows={4}
            disabled={busy}
          />
          <div className="dump-actions">
            <span className="dump-hint">⌘ + Enter to untangle</span>
            <button
              className="btn"
              onClick={untangle}
              disabled={busy || !text.trim()}
            >
              {busy ? (
                <>
                  <span className="spin" />
                  Untangling…
                </>
              ) : (
                <>Untangle</>
              )}
            </button>
          </div>
          {busy && (
            <div className="untangling">
              <span className="spin" />
              <span>Reading your thoughts, finding the threads…</span>
            </div>
          )}
        </div>

        {/* Preview block */}
        {preview && (
          <div className="preview">
            <h3 className="preview-title">
              {preview.tasks.length === 1
                ? "Found 1 thing. Save it?"
                : `Found ${preview.tasks.length} things. Pick what to keep.`}
            </h3>
            <div className="preview-list">
              {preview.tasks.map((t, i) => (
                <div key={i}>
                  <div className="preview-item">
                    <input
                      type="checkbox"
                      className="preview-cb"
                      checked={t.selected}
                      onChange={() => togglePreviewParent(i)}
                    />
                    <span className={`dot ${t.priority}`} />
                    <div className="preview-text">
                      {t.title}
                      <div className="preview-text-meta">
                        {t.priority} · {t.deadline ? formatDeadline(t.deadline) : "no deadline"}
                      </div>
                    </div>
                  </div>
                  {t.subtasks?.map((s, j) => (
                    <div key={j} className="preview-item subtask">
                      <input
                        type="checkbox"
                        className="preview-cb"
                        checked={s.selected}
                        disabled={!t.selected}
                        onChange={() => togglePreviewSub(i, j)}
                      />
                      <span className={`dot ${s.priority}`} />
                      <div className="preview-text">
                        {s.title}
                        <div className="preview-text-meta">
                          {s.priority} · {s.deadline ? formatDeadline(s.deadline) : "inherits parent"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="preview-actions">
              <button className="btn-ghost" onClick={discardPreview}>
                Discard
              </button>
              <button className="btn" onClick={savePreview}>
                Save selected
              </button>
            </div>
          </div>
        )}

        {/* Tasks section */}
        <section className="tasks-section">
          <div className="tasks-head">
            <h2>Your tasks</h2>
            <div className="tasks-controls">
            <div className="filters" role="tablist">
              {(["all", "active", "done"] as Filter[]).map((f, idx) => (
                <span key={f} style={{ display: "inline-flex", alignItems: "center" }}>
                  <button
                    className={`pill ${filter === f ? "active" : ""}`}
                    onClick={() => setFilter(f)}
                    role="tab"
                    aria-selected={filter === f}
                  >
                    {f === "all" ? "All" : f === "active" ? "Active" : "Done"}
                    <span className="count">{counts[f]}</span>
                  </button>
                  {idx < 2 && (
                    <span style={{ color: "var(--muted)", opacity: 0.5, fontSize: 14 }}>·</span>
                  )}
                </span>
              ))}
            </div>
            <div className="sort-row">
              <span className="sort-label">Sort</span>
              {(["recent", "deadline", "priority"] as SortBy[]).map((s) => (
                <button
                  key={s}
                  className={`sort-pill ${sortBy === s ? "active" : ""}`}
                  onClick={() => setSortBy(s)}
                  title={s === "recent" ? "Most recent first" : s === "deadline" ? "Closest deadline first" : "Highest priority first"}
                >
                  {s === "recent" ? <HistoryIcon /> : s === "deadline" ? <CalendarIcon /> : <FlagIcon />}
                  <span>{s === "recent" ? "Recent" : s === "deadline" ? "Deadline" : "Priority"}</span>
                </button>
              ))}
            </div>
            </div>
          </div>

          {sorted.length === 0 ? (
            <div className="empty">
              <TangleIcon style={{ color: "var(--muted)" }} />
              <h3>Nothing on your mind yet</h3>
              <p>Drop your first thought above.</p>
            </div>
          ) : (
            <div className="tasks-list">
              {sorted.map((t) => (
                <TaskRowGroup
                  key={t.id}
                  task={t}
                  onToggle={toggleDone}
                  onDelete={deleteTask}
                  editingId={editingId}
                  editText={editText}
                  setEditText={setEditText}
                  startEdit={startEdit}
                  saveEdit={saveEdit}
                  cancelEdit={() => setEditingId(null)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* FAB */}
      <button className="fab" onClick={openCoach} aria-label="What should I do now?">
        <span className="spark">
          <SparkIcon />
        </span>
        <span className="fab-label">What should I do now?</span>
      </button>

      {/* Coach overlay */}
      {coachOpen && (
        <div className="coach-backdrop" onClick={() => setCoachOpen(false)}>
          <div
            className="coach"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="coach-eyebrow">Next 2 hours</div>
            <h3>Here&apos;s what I&apos;d do.</h3>
            <p className="coach-sub">
              Three small moves. You don&apos;t have to do them all.
            </p>
            {coachLoading ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>
                <span className="spin" style={{
                  display: "inline-block",
                  width: 20,
                  height: 20,
                  border: "2px solid var(--border)",
                  borderTopColor: "var(--accent)",
                  borderRadius: "999px",
                  animation: "spin 700ms linear infinite",
                  marginBottom: 12,
                }} />
                <div>Reading your list…</div>
              </div>
            ) : !coachItems || coachItems.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>
                Your list is empty — nothing to coach on yet.
              </div>
            ) : (
              <div className="coach-list">
                {coachItems.map((item, i) => (
                  <div className="coach-item" key={item.id}>
                    <div className="coach-rank">{i + 1}</div>
                    <div className="coach-item-body">
                      <div className="coach-item-title">{item.title}</div>
                      <div className="coach-item-why">{item.why}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="coach-actions">
              <button className="btn-ghost" onClick={() => setCoachOpen(false)}>
                Maybe later
              </button>
              <button className="btn" onClick={() => setCoachOpen(false)}>
                Sounds good
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

type RowSharedProps = {
  onToggle: (id: string, currentDone: boolean) => void;
  onDelete: (id: string) => void;
  editingId: string | null;
  editText: string;
  setEditText: (s: string) => void;
  startEdit: (task: Task) => void;
  saveEdit: (id: string) => void;
  cancelEdit: () => void;
};

function TaskRowGroup({
  task,
  ...shared
}: { task: Task } & RowSharedProps) {
  return (
    <>
      <TaskRow task={task} {...shared} />
      {task.subtasks?.map((s) => (
        <TaskRow key={s.id} task={s} isSubtask {...shared} />
      ))}
    </>
  );
}

function TaskRow({
  task,
  isSubtask = false,
  onToggle,
  onDelete,
  editingId,
  editText,
  setEditText,
  startEdit,
  saveEdit,
  cancelEdit,
}: { task: Task; isSubtask?: boolean } & RowSharedProps) {
  const dotCls = task.priority as Priority;
  const isOverdue =
    !!task.deadline &&
    !task.done &&
    new Date(task.deadline).getTime() < new Date().setHours(0, 0, 0, 0);
  const isEditing = editingId === task.id;
  const cls = `task ${task.done ? "done" : ""} ${isSubtask ? "subtask" : ""} ${isOverdue ? "overdue" : ""}`;
  const deadline = formatDeadline(task.deadline);
  return (
    <div className={cls}>
      <span className={`dot ${dotCls}`} aria-label={`${task.priority} priority`} />
      <div className="task-body">
        {isEditing ? (
          <input
            autoFocus
            className="task-title-input"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={() => saveEdit(task.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                saveEdit(task.id);
              }
              if (e.key === "Escape") cancelEdit();
            }}
          />
        ) : (
          <div className="task-title" onClick={() => startEdit(task)}>
            {task.title}
          </div>
        )}
        {deadline ? (
          <div className="task-meta">
            <ClockIcon />
            <span>{deadline}</span>
          </div>
        ) : (
          <div className="task-meta" style={{ opacity: 0.7 }}>
            No deadline
          </div>
        )}
      </div>
      <button
        className="task-delete"
        aria-label="Delete"
        onClick={() => onDelete(task.id)}
      >
        <TrashIcon />
      </button>
      <button
        className="check"
        aria-label={task.done ? "Mark as not done" : "Mark as done"}
        onClick={() => onToggle(task.id, task.done)}
      >
        <CheckIcon />
      </button>
    </div>
  );
}
