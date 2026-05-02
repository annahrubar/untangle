"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  KnotIcon,
  ClockIcon,
  CheckIcon,
  TangleIcon,
  TrashIcon,
  CalendarIcon,
  FlagIcon,
  HistoryIcon,
  SunriseIcon,
} from "@/components/Icons";
import type { Task, ParsedTask, Priority, RecommendItem } from "@/lib/types";

type Filter = "all" | "active" | "done";
type SortBy = "recent" | "deadline" | "priority";

function isoToDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

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
  const [deadlineEditingId, setDeadlineEditingId] = useState<string | null>(null);
  const quickDeadlineRef = useRef<HTMLInputElement>(null);

  function openQuickDeadline() {
    const el = quickDeadlineRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") {
      try {
        el.showPicker();
        return;
      } catch {
        // fall through
      }
    }
    el.focus();
    el.click();
  }
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [quickDeadline, setQuickDeadline] = useState("");
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachItems, setCoachItems] = useState<RecommendItem[] | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

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
    const rawInput = text;
    const fallbackDate = quickDeadline || null;
    fetch("/api/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (!Array.isArray(d.tasks) || d.tasks.length === 0) {
          setBusy(false);
          return;
        }
        // Apply quickDeadline as fallback wherever AI didn't set one
        const enriched: ParsedTask[] = d.tasks.map((t: ParsedTask) => ({
          ...t,
          deadline: t.deadline ?? fallbackDate,
          subtasks: (t.subtasks ?? []).map((s) => ({
            ...s,
            deadline: s.deadline ?? fallbackDate,
          })),
        }));

        const totalSubtasks = enriched.reduce(
          (acc, t) => acc + (t.subtasks?.length ?? 0),
          0
        );
        const isSingle = enriched.length === 1 && totalSubtasks === 0;

        if (isSingle) {
          // Auto-save: skip preview
          fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              rawInput,
              selected: enriched.map((t) => ({
                title: t.title,
                priority: t.priority,
                deadline: t.deadline,
                subtasks: [],
              })),
            }),
          })
            .then((r) => r.json())
            .then((res) => {
              if (Array.isArray(res.tasks)) {
                setTasks((cur) => [...res.tasks, ...cur]);
                const savedTitle = res.tasks[0]?.title ?? "Task";
                setToast(`Saved · ${savedTitle}`);
              }
              setText("");
              setQuickDeadline("");
            })
            .catch(() => {})
            .finally(() => setBusy(false));
          return;
        }

        // Multiple tasks or has subtasks → show preview
        const tasksWithSelected: SelectableTask[] = enriched.map((t) => ({
          title: t.title,
          priority: t.priority,
          deadline: t.deadline,
          selected: true,
          subtasks: (t.subtasks ?? []).map((s) => ({
            title: s.title,
            priority: s.priority,
            deadline: s.deadline,
            selected: true,
          })),
        }));
        setPreview({ rawInput, tasks: tasksWithSelected });
        setBusy(false);
      })
      .catch(() => setBusy(false));
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

  function setPreviewDeadline(i: number, j: number | null, isoDate: string) {
    if (!preview) return;
    const next = [...preview.tasks];
    const value = isoDate || null;
    if (j === null) {
      next[i] = { ...next[i], deadline: value };
    } else {
      const subs = [...(next[i].subtasks ?? [])];
      subs[j] = { ...subs[j], deadline: value };
      next[i] = { ...next[i], subtasks: subs };
    }
    setPreview({ ...preview, tasks: next });
  }

  function discardPreview() {
    setPreview(null);
    setText("");
    setQuickDeadline("");
  }

  function savePreviewFlat() {
    if (!preview) return;
    const selected = preview.tasks
      .filter((t) => t.selected)
      .map((t) => ({
        title: t.title,
        priority: t.priority,
        deadline: t.deadline,
        subtasks: [],
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

  function saveDeadline(id: string, isoDate: string) {
    setDeadlineEditingId(null);
    const payload = isoDate ? { deadline: isoDate } : { deadline: null };
    const newDeadlineIso = isoDate
      ? new Date(isoDate + "T00:00:00.000Z").toISOString()
      : null;
    fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(() => {
        setTasks((cur) =>
          cur.map((t) => {
            if (t.id === id) return { ...t, deadline: newDeadlineIso };
            return {
              ...t,
              subtasks: t.subtasks?.map((s) =>
                s.id === id ? { ...s, deadline: newDeadlineIso } : s
              ),
            };
          })
        );
      })
      .catch(() => {});
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

  function openCoach(_mode: "today" = "today") {
    setCoachOpen(true);
    setCoachLoading(true);
    fetch("/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "today" }),
    })
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
          <div className="hero-chips">
            <span className="hero-chip">
              <span className="hero-chip-emoji">⚡</span>
              Spots what&apos;s urgent
            </span>
            <span className="hero-chip">
              <span className="hero-chip-emoji">📅</span>
              Catches deadlines
            </span>
            <span className="hero-chip">
              <span className="hero-chip-emoji">🪢</span>
              Untangles the big stuff
            </span>
          </div>
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
            <div className="dump-controls">
              <button
                type="button"
                className={`quick-deadline ${quickDeadline ? "set" : ""}`}
                onClick={openQuickDeadline}
                title="Set a deadline for tasks where AI didn't find one"
              >
                <CalendarIcon />
                <span>
                  {quickDeadline
                    ? formatDeadline(
                        new Date(quickDeadline + "T00:00:00.000Z").toISOString()
                      )
                    : "Date"}
                </span>
              </button>
              <input
                ref={quickDeadlineRef}
                type="date"
                value={quickDeadline}
                onChange={(e) => setQuickDeadline(e.target.value)}
                className="quick-deadline-native"
                tabIndex={-1}
                aria-hidden="true"
              />
              {quickDeadline && (
                <button
                  type="button"
                  className="quick-deadline-clear"
                  onClick={() => setQuickDeadline("")}
                  aria-label="Clear date"
                >
                  ×
                </button>
              )}
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
          </div>
          {busy && (
            <div className="untangling">
              <span className="spin" />
              <span>Reading your thoughts, finding the threads…</span>
            </div>
          )}
        </div>

        {/* Preview block */}
        {preview && (() => {
          const hasSubtasks = preview.tasks.some(
            (t) => (t.subtasks?.length ?? 0) > 0
          );
          const isSingleParentWithSubs =
            preview.tasks.length === 1 &&
            (preview.tasks[0].subtasks?.length ?? 0) > 0;
          const subtaskCount = preview.tasks[0]?.subtasks?.length ?? 0;
          let title: string;
          if (isSingleParentWithSubs) {
            title = `We broke this into ${subtaskCount} steps. Keep it as a tree, or save as one task?`;
          } else if (hasSubtasks) {
            title = `Found ${preview.tasks.length} tasks (some with sub-steps). Pick what to keep.`;
          } else if (preview.tasks.length === 1) {
            title = "Found 1 thing. Save it?";
          } else {
            title = `Found ${preview.tasks.length} things. Pick what to keep.`;
          }
          return (
          <div className="preview">
            <h3 className="preview-title">{title}</h3>
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
                        <span>{t.priority}</span>
                        <span>·</span>
                        <input
                          type="date"
                          className="preview-date-input"
                          value={isoToDateInput(t.deadline)}
                          onChange={(e) => setPreviewDeadline(i, null, e.target.value)}
                        />
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
                          <span>{s.priority}</span>
                          <span>·</span>
                          <input
                            type="date"
                            className="preview-date-input"
                            value={isoToDateInput(s.deadline)}
                            onChange={(e) => setPreviewDeadline(i, j, e.target.value)}
                          />
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
              {hasSubtasks ? (
                <>
                  <button className="btn-ghost" onClick={savePreviewFlat}>
                    Save as one task
                  </button>
                  <button className="btn" onClick={savePreview}>
                    Save with subtasks
                  </button>
                </>
              ) : (
                <button className="btn" onClick={savePreview}>
                  Save selected
                </button>
              )}
            </div>
          </div>
          );
        })()}

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
            counts.all === 0 ? (
              <div className="empty">
                <TangleIcon style={{ color: "var(--muted)" }} />
                <h3>Nothing on your mind yet</h3>
                <p>Drop your first thought above.</p>
              </div>
            ) : filter === "active" && counts.active === 0 ? (
              <div className="empty empty-celebrate">
                <span className="empty-emoji" aria-hidden="true">🎉</span>
                <h3>All done!</h3>
                <p>Your list is clear. Take a breath — or drop a new thought.</p>
              </div>
            ) : (
              <div className="empty">
                <CheckIcon style={{ color: "var(--muted)", width: 28, height: 28 }} />
                <h3>Nothing checked off yet</h3>
                <p>Switch to <strong>Active</strong> to see what&apos;s on your plate.</p>
              </div>
            )
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
                  deadlineEditingId={deadlineEditingId}
                  setDeadlineEditingId={setDeadlineEditingId}
                  saveDeadline={saveDeadline}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Toast */}
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <CheckIcon />
          <span>{toast}</span>
        </div>
      )}

      {/* FAB */}
      <button
        className="fab"
        onClick={() => openCoach("today")}
        aria-label="What's on for today?"
      >
        <span className="spark">
          <SunriseIcon />
        </span>
        <span className="fab-label">What&apos;s on today?</span>
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
            <div className="coach-eyebrow">Today</div>
            <h3>Your day, sketched.</h3>
            <p className="coach-sub">
              A few moves to shape today. Adjust as you go.
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
  deadlineEditingId: string | null;
  setDeadlineEditingId: (id: string | null) => void;
  saveDeadline: (id: string, isoDate: string) => void;
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
  deadlineEditingId,
  setDeadlineEditingId,
  saveDeadline,
}: { task: Task; isSubtask?: boolean } & RowSharedProps) {
  const dotCls = task.priority as Priority;
  const isOverdue =
    !!task.deadline &&
    !task.done &&
    new Date(task.deadline).getTime() < new Date().setHours(0, 0, 0, 0);
  const isEditing = editingId === task.id;
  const isEditingDeadline = deadlineEditingId === task.id;
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
        {isEditingDeadline ? (
          <input
            type="date"
            autoFocus
            className="deadline-input"
            defaultValue={isoToDateInput(task.deadline)}
            onChange={(e) => saveDeadline(task.id, e.target.value)}
            onBlur={() => setDeadlineEditingId(null)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setDeadlineEditingId(null);
            }}
          />
        ) : deadline ? (
          <button
            className="task-meta deadline-pill"
            onClick={() => setDeadlineEditingId(task.id)}
            title="Click to change deadline"
          >
            <ClockIcon />
            <span>{deadline}</span>
          </button>
        ) : (
          <button
            className="deadline-add"
            onClick={() => setDeadlineEditingId(task.id)}
          >
            <CalendarIcon />
            <span>Add date</span>
          </button>
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
