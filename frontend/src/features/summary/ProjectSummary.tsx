import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiGet, apiPost, apiPatch, apiUpload, apiDelete } from "@/api/client";
import { useAppStore } from "@/store/useAppStore";
import type { ProjectSummary as ProjectSummaryType, ProjectPhase, WorkPackage, ProjectDeliverable } from "@/types";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  LayoutDashboard,
  BookOpen,
  AlertTriangle,
  Calendar as CalendarIcon,
  Layers,
  Package,
  Loader2,
  ChevronRight,
  Plus,
  Trash2,
  Upload,
  RotateCcw,
  ListTodo,
  Pencil,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const DELIVERABLE_TYPES = [
  { value: "document", label: "Documento" },
  { value: "block_diagram", label: "Block diagram" },
  { value: "prototype", label: "Prototipo" },
  { value: "report", label: "Report" },
  { value: "code", label: "Codice" },
  { value: "other", label: "Altro" },
];
const DELIVERABLE_TYPE_LABELS: Record<string, string> = Object.fromEntries(DELIVERABLE_TYPES.map((t) => [t.value, t.label]));

type GanttPhase = ProjectSummaryType["phases"][number];

interface GanttRow {
  id: string;
  label: string;
  start: Date;
  end: Date;
  isPhase: boolean;
}

function ProjectGantt({ phases }: { phases: GanttPhase[] }) {
  const rows: GanttRow[] = [];
  for (const p of phases) {
    if (p.startDate && p.endDate) {
      rows.push({
        id: p.id,
        label: p.name,
        start: new Date(p.startDate),
        end: new Date(p.endDate),
        isPhase: true,
      });
    }
    for (const wp of p.workPackages ?? []) {
      if (wp.startDate && wp.endDate) {
        rows.push({
          id: wp.id,
          label: wp.name,
          start: new Date(wp.startDate),
          end: new Date(wp.endDate),
          isPhase: false,
        });
      }
    }
  }
  if (rows.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)] py-6 text-center">
        Imposta date di inizio e fine alle fasi e ai work package per vedere il diagramma di Gantt.
      </p>
    );
  }
  const minDate = new Date(Math.min(...rows.map((r) => r.start.getTime())));
  const maxDate = new Date(Math.max(...rows.map((r) => r.end.getTime())));
  const totalMs = maxDate.getTime() - minDate.getTime() || 1;
  const monthLabels: { date: Date; label: string }[] = [];
  const d = new Date(minDate);
  d.setDate(1);
  while (d <= maxDate) {
    monthLabels.push({ date: new Date(d), label: format(d, "MMM yyyy", { locale: it }) });
    d.setMonth(d.getMonth() + 1);
  }
  const barMinWidth = 120;
  const timelineWidth = Math.max(barMinWidth * monthLabels.length, 200);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[280px]" style={{ width: timelineWidth + 180 }}>
        <div className="flex border-b border-[var(--border)] pb-1 mb-1">
          <div className="w-[160px] shrink-0 text-xs font-medium text-[var(--muted)]">Attività</div>
          <div className="flex-1 flex text-xs text-[var(--muted)]" style={{ minWidth: timelineWidth }}>
            {monthLabels.map((m) => (
              <div key={m.label} className="shrink-0 text-center" style={{ width: barMinWidth }}>
                {m.label}
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-0.5">
          {rows.map((row) => {
            const left = ((row.start.getTime() - minDate.getTime()) / totalMs) * 100;
            const width = ((row.end.getTime() - row.start.getTime()) / totalMs) * 100;
            return (
              <div key={row.id} className="flex items-center gap-2 min-h-[28px]">
                <div
                  className={`w-[160px] shrink-0 truncate text-sm ${row.isPhase ? "font-semibold text-[var(--accent)]" : "text-[var(--muted)] pl-4"}`}
                  title={row.label}
                >
                  {row.label}
                </div>
                <div className="flex-1 relative h-5 rounded bg-[var(--surface)]" style={{ minWidth: timelineWidth }}>
                  <div
                    className="absolute top-0.5 bottom-0.5 rounded bg-indigo-500 dark:bg-indigo-400 opacity-90"
                    style={{
                      left: `${left}%`,
                      width: `${Math.max(width, 2)}%`,
                    }}
                    title={`${format(row.start, "d MMM yyyy", { locale: it })} – ${format(row.end, "d MMM yyyy", { locale: it })}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface DeliverableTableProps {
  deliverables: ProjectDeliverable[];
  compact?: boolean;
  projectId?: string;
  phaseId?: string | null;
  workPackageId?: string | null;
  onUpdate?: () => void;
  /** Se fornito, dopo "Diventa task" aggiorna solo lo stato (no refetch) così non si perde lo scroll */
  onConvertToTask?: (deliverableId: string, taskId: string) => void;
  /** Se fornito, dopo modifica deliverable aggiorna solo lo stato (no refetch). Patch: title, type?, dueDate?, dueDateRelative? */
  onRenameDeliverable?: (deliverableId: string, patch: { title: string; type?: string; dueDate?: string | null; dueDateRelative?: string | null }) => void;
}

function DeliverableTable({ deliverables, compact, projectId, phaseId, workPackageId, onUpdate, onConvertToTask, onRenameDeliverable }: DeliverableTableProps) {
  const [adding, setAdding] = useState(false);
  const [newType, setNewType] = useState("document");
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newDueDateRelative, setNewDueDateRelative] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingTitle, setRenamingTitle] = useState("");
  const [renamingType, setRenamingType] = useState("");
  const [renamingDueDate, setRenamingDueDate] = useState("");
  const [renamingDueDateRelative, setRenamingDueDateRelative] = useState("");

  const canEdit = projectId && (phaseId || workPackageId) && onUpdate;
  const canConvertToTask = projectId && (onUpdate || onConvertToTask);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || (!phaseId && !workPackageId) || !newTitle.trim() || saving) return;
    setSaving(true);
    try {
      await apiPost(`/projects/${projectId}/deliverables`, {
        phaseId: phaseId || undefined,
        workPackageId: workPackageId || undefined,
        type: newType,
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        dueDate: newDueDate || undefined,
        dueDateRelative: newDueDateRelative.trim() || undefined,
      });
      setNewTitle("");
      setNewDescription("");
      setNewDueDate("");
      setNewDueDateRelative("");
      setAdding(false);
      onUpdate?.();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!projectId || !onUpdate || !confirm("Rimuovere questo deliverable?")) return;
    setDeletingId(id);
    try {
      await apiDelete(`/projects/${projectId}/deliverables/${id}`);
      onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleConvertToTask = async (id: string) => {
    if (!projectId || (!onUpdate && !onConvertToTask)) return;
    setConvertingId(id);
    try {
      const task = await apiPost<{ id: string }>(`/projects/${projectId}/deliverables/${id}/convert-to-task`, {});
      if (onConvertToTask && task?.id) {
        onConvertToTask(id, task.id);
      } else {
        onUpdate?.();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setConvertingId(null);
    }
  };

  const handleStartRename = (d: ProjectDeliverable) => {
    setRenamingId(d.id);
    setRenamingTitle(d.title);
    setRenamingType(d.type);
    setRenamingDueDate(d.dueDate ? d.dueDate.slice(0, 10) : "");
    setRenamingDueDateRelative(d.dueDateRelative ?? "");
  };

  const handleSaveRename = async () => {
    if (!projectId || !renamingId || !renamingTitle.trim()) {
      setRenamingId(null);
      return;
    }
    const title = renamingTitle.trim();
    const type = renamingType;
    const dueDate = renamingDueDate.trim() || null;
    const dueDateRelative = renamingDueDateRelative.trim() || null;
    const d = deliverables.find((x) => x.id === renamingId);
    const unchanged =
      d?.title === title &&
      d?.type === type &&
      (d?.dueDate ? d.dueDate.slice(0, 10) : "") === (dueDate ?? "") &&
      (d?.dueDateRelative ?? "") === (dueDateRelative ?? "");
    if (unchanged) {
      setRenamingId(null);
      return;
    }
    try {
      await apiPatch(`/projects/${projectId}/deliverables/${renamingId}`, { title, type, dueDate, dueDateRelative });
      if (onRenameDeliverable) onRenameDeliverable(renamingId, { title, type, dueDate, dueDateRelative });
      else onUpdate?.();
    } catch (err) {
      console.error(err);
    } finally {
      setRenamingId(null);
    }
  };

  if (compact) {
    return (
      <div>
        <ul className="text-xs space-y-1">
          {deliverables.map((d) => (
            <li
              key={d.id}
              className={`flex items-center gap-2 text-[var(--accent-soft)] group rounded px-1.5 py-0.5 -mx-1.5 ${d.taskId ? "bg-emerald-50/70 dark:bg-emerald-900/25 border-l-2 border-emerald-500" : ""}`}
            >
              {renamingId === d.id ? (
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <select
                    value={renamingType}
                    onChange={(e) => setRenamingType(e.target.value)}
                    className="w-full max-w-[120px] px-1.5 py-0.5 rounded border border-[var(--border)] bg-white dark:bg-gray-100 text-gray-900 text-xs"
                  >
                    {DELIVERABLE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={renamingTitle}
                    onChange={(e) => setRenamingTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.preventDefault();
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    className="w-full min-w-0 px-1.5 py-0.5 rounded border border-[var(--border)] bg-white dark:bg-gray-100 text-gray-900 text-xs"
                    autoFocus
                    placeholder="Titolo"
                  />
                  <div className="flex gap-1 flex-wrap">
                    <input
                      type="date"
                      value={renamingDueDate}
                      onChange={(e) => setRenamingDueDate(e.target.value)}
                      className="px-1.5 py-0.5 rounded border border-[var(--border)] bg-white dark:bg-gray-100 text-gray-900 text-xs"
                    />
                    <input
                      type="text"
                      value={renamingDueDateRelative}
                      onChange={(e) => setRenamingDueDateRelative(e.target.value)}
                      placeholder="T0+3mesi"
                      className="flex-1 min-w-[4rem] px-1.5 py-0.5 rounded border border-[var(--border)] bg-white dark:bg-gray-100 text-gray-900 text-xs"
                    />
                    <button type="button" onClick={handleSaveRename} className="px-1.5 py-0.5 rounded bg-indigo-600 text-white text-xs">Salva</button>
                  </div>
                </div>
              ) : (
                <>
                  <span className="text-[var(--muted)] shrink-0">{DELIVERABLE_TYPE_LABELS[d.type] ?? d.type}</span>
                  <span className="flex-1 min-w-0 truncate">{d.title}</span>
                </>
              )}
              {canEdit && renamingId !== d.id && (
                <button type="button" onClick={() => handleStartRename(d)} className="p-1 rounded text-[var(--muted)] hover:bg-[var(--surface-hover)] opacity-0 group-hover:opacity-100 shrink-0" aria-label="Rinomina">
                  <Pencil className="w-3 h-3" />
                </button>
              )}
              {d.taskId && projectId && (
                <Link to={`/project/${projectId}/board`} className="shrink-0 text-emerald-600 dark:text-emerald-400 hover:underline font-medium" title="Vai al task nella Board">
                  Task creato
                </Link>
              )}
              {d.dueDate && <span className="text-[var(--muted)] shrink-0">{format(new Date(d.dueDate), "d MMM yyyy", { locale: it })}</span>}
              {canConvertToTask && !d.taskId && (
                <button
                  type="button"
                  onClick={() => handleConvertToTask(d.id)}
                  disabled={convertingId === d.id}
                  className="p-1 rounded text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  title="Crea task in Board (Da fare)"
                  aria-label="Diventa task"
                >
                  <ListTodo className="w-3.5 h-3.5" />
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => handleDelete(d.id)}
                  disabled={deletingId === d.id}
                  className="p-1 rounded text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  aria-label="Rimuovi"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
        {canEdit && (
          <>
            {!adding ? (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="mt-2 flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                Aggiungi deliverable
              </button>
            ) : (
              <form onSubmit={handleAdd} className="mt-2 p-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-2">
                <select value={newType} onChange={(e) => setNewType(e.target.value)} className="w-full px-2 py-1 rounded border border-[var(--border)] bg-white dark:bg-gray-100 text-gray-900 text-sm">
                  {DELIVERABLE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Titolo" required className="w-full px-2 py-1 rounded border border-[var(--border)] bg-white dark:bg-gray-100 text-gray-900 text-sm" />
                <div className="flex gap-2 flex-wrap">
                  <input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} className="flex-1 min-w-0 px-2 py-1 rounded border border-[var(--border)] bg-white dark:bg-gray-100 text-gray-900 text-sm" />
                  <input type="text" value={newDueDateRelative} onChange={(e) => setNewDueDateRelative(e.target.value)} placeholder="T0+3mesi" className="flex-1 min-w-0 px-2 py-1 rounded border border-[var(--border)] bg-white dark:bg-gray-100 text-gray-900 text-sm" />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={saving} className="px-2 py-1 rounded bg-indigo-600 text-white text-xs disabled:opacity-50">Aggiungi</button>
                  <button type="button" onClick={() => { setAdding(false); setNewTitle(""); }} className="px-2 py-1 rounded bg-[var(--surface-hover)] text-xs">Annulla</button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--muted)] border-b border-[var(--border)]">
              <th className="py-1.5 pr-2">Tipo</th>
              <th className="py-1.5 pr-2">Titolo</th>
              <th className="py-1.5 pr-2 hidden sm:table-cell">Descrizione</th>
              <th className="py-1.5 pr-2">Scadenza</th>
              {(canEdit || canConvertToTask) && <th className="py-1.5 w-20" aria-label="Azioni" />}
            </tr>
          </thead>
          <tbody>
            {deliverables.map((d) => (
              <tr key={d.id} className={`border-b border-[var(--border)] last:border-0 ${d.taskId ? "bg-emerald-50/60 dark:bg-emerald-900/20" : ""}`}>
                <td className="py-2 pr-2 text-[var(--muted)]">
                  {renamingId === d.id ? (
                    <select
                      value={renamingType}
                      onChange={(e) => setRenamingType(e.target.value)}
                      className="px-2 py-1 rounded border border-[var(--border)] bg-white dark:bg-gray-100 text-gray-900 text-sm"
                    >
                      {DELIVERABLE_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  ) : (
                    DELIVERABLE_TYPE_LABELS[d.type] ?? d.type
                  )}
                </td>
                <td className="py-2 pr-2 font-medium text-[var(--accent)]">
                  {renamingId === d.id ? (
                    <input
                      type="text"
                      value={renamingTitle}
                      onChange={(e) => setRenamingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveRename();
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      className="w-full max-w-[200px] px-2 py-1 rounded border border-[var(--border)] bg-white dark:bg-gray-100 text-gray-900 text-sm"
                      autoFocus
                      placeholder="Titolo"
                    />
                  ) : (
                    <>
                      {d.title}
                      {canEdit && (
                        <button type="button" onClick={() => handleStartRename(d)} className="ml-2 p-1 rounded text-[var(--muted)] hover:bg-[var(--surface-hover)] align-middle" aria-label="Rinomina">
                          <Pencil className="w-3.5 h-3.5 inline" />
                        </button>
                      )}
                      {d.taskId && projectId && (
                        <Link to={`/project/${projectId}/board`} className="ml-2 inline-flex items-center text-xs text-emerald-600 dark:text-emerald-400 hover:underline" title="Vai al task nella Board">
                          → Task creato
                        </Link>
                      )}
                    </>
                  )}
                </td>
                <td className="py-2 pr-2 text-[var(--accent-soft)] hidden sm:table-cell max-w-[200px] truncate">{d.description ?? "—"}</td>
                <td className="py-2 pr-2 text-[var(--muted)]">
                  {renamingId === d.id ? (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex gap-2 flex-wrap items-center">
                        <input
                          type="date"
                          value={renamingDueDate}
                          onChange={(e) => setRenamingDueDate(e.target.value)}
                          className="px-2 py-1 rounded border border-[var(--border)] bg-white dark:bg-gray-100 text-gray-900 text-sm"
                        />
                        <input
                          type="text"
                          value={renamingDueDateRelative}
                          onChange={(e) => setRenamingDueDateRelative(e.target.value)}
                          placeholder="T0+3mesi"
                          className="w-24 px-2 py-1 rounded border border-[var(--border)] bg-white dark:bg-gray-100 text-gray-900 text-sm"
                        />
                        <button type="button" onClick={handleSaveRename} className="px-2 py-1 rounded bg-indigo-600 text-white text-sm">Salva</button>
                      </div>
                    </div>
                  ) : (
                    d.dueDate ? format(new Date(d.dueDate), "d MMM yyyy", { locale: it }) : "—"
                  )}
                </td>
                {(canEdit || canConvertToTask) && (
                  <td className="py-2">
                    <div className="flex items-center gap-1">
                      {canConvertToTask && !d.taskId && (
                        <button type="button" onClick={() => handleConvertToTask(d.id)} disabled={convertingId === d.id} className="p-1.5 rounded text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30" title="Crea task in Board (Da fare)" aria-label="Diventa task">
                          <ListTodo className="w-4 h-4" />
                        </button>
                      )}
                      {canEdit && (
                        <button type="button" onClick={() => handleDelete(d.id)} disabled={deletingId === d.id} className="p-1.5 rounded text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30" aria-label="Rimuovi">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canEdit && (
        <>
          {!adding ? (
            <button type="button" onClick={() => setAdding(true)} className="mt-2 flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
              <Plus className="w-4 h-4" />
              Aggiungi deliverable
            </button>
          ) : (
            <form onSubmit={handleAdd} className="mt-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--muted)] mb-1">Tipo</label>
                  <select value={newType} onChange={(e) => setNewType(e.target.value)} className="w-full px-3 py-2 rounded border border-[var(--border)] bg-white dark:bg-gray-100 text-gray-900 text-sm">
                    {DELIVERABLE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[var(--muted)] mb-1">Titolo *</label>
                  <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Titolo" required className="w-full px-3 py-2 rounded border border-[var(--border)] bg-white dark:bg-gray-100 text-gray-900 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-[var(--muted)] mb-1">Descrizione (opzionale)</label>
                <input type="text" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Descrizione" className="w-full px-3 py-2 rounded border border-[var(--border)] bg-white dark:bg-gray-100 text-gray-900 text-sm" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--muted)] mb-1">Scadenza (data)</label>
                  <input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} className="w-full px-3 py-2 rounded border border-[var(--border)] bg-white dark:bg-gray-100 text-gray-900 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-[var(--muted)] mb-1">Scadenza (T0+...)</label>
                  <input type="text" value={newDueDateRelative} onChange={(e) => setNewDueDateRelative(e.target.value)} placeholder="es. T0+3mesi" className="w-full px-3 py-2 rounded border border-[var(--border)] bg-white dark:bg-gray-100 text-gray-900 text-sm" />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="px-3 py-2 rounded bg-indigo-600 text-white text-sm disabled:opacity-50">Aggiungi</button>
                <button type="button" onClick={() => { setAdding(false); setNewTitle(""); setNewDescription(""); }} className="px-3 py-2 rounded bg-[var(--surface-hover)] text-sm">Annulla</button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}

export function ProjectSummary() {
  const { projectId } = useParams<{ projectId: string }>();
  const projectNameFromStore = useAppStore((s) => s.projects.find((p) => p.id === projectId)?.name);
  const [data, setData] = useState<ProjectSummaryType | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<{ phases: number; workPackages: number; deliverables: number } | null>(null);
  const [resetting, setResetting] = useState(false);
  const [t0Saving, setT0Saving] = useState(false);
  const [t0Value, setT0Value] = useState<string>("");
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const fetchSummary = () => {
    if (!projectId) return;
    setLoading(true);
    setSummaryError(null);
    apiGet<ProjectSummaryType>(`/projects/${projectId}/summary`)
      .then((d) => {
        setData(d);
        setImportSuccess(null);
        setT0Value(d.project.t0Date ? d.project.t0Date.slice(0, 10) : "");
      })
      .catch((err) => {
        console.error(err);
        setSummaryError(err instanceof Error ? err.message : "Errore di rete o server.");
      })
      .finally(() => setLoading(false));
  };

  /** Aggiorna solo il taskId del deliverable in stato (no refetch, così non si perde lo scroll) */
  const setDeliverableTaskId = (deliverableId: string, taskId: string) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        phases: prev.phases.map((phase) => ({
          ...phase,
          deliverables: (phase.deliverables ?? []).map((d) => (d.id === deliverableId ? { ...d, taskId } : d)),
          workPackages: phase.workPackages.map((wp) => ({
            ...wp,
            deliverables: (wp.deliverables ?? []).map((d) => (d.id === deliverableId ? { ...d, taskId } : d)),
          })),
        })),
        workPackages: prev.workPackages.map((wp) => ({
          ...wp,
          deliverables: (wp.deliverables ?? []).map((d) => (d.id === deliverableId ? { ...d, taskId } : d)),
        })),
      };
    });
  };

  /** Aggiorna titolo/tipo/data deliverable in stato (no refetch) */
  const setDeliverableEdit = (deliverableId: string, patch: { title: string; type?: string; dueDate?: string | null; dueDateRelative?: string | null }) => {
    setData((prev) => {
      if (!prev) return prev;
      const upd = (d: ProjectDeliverable) => (d.id === deliverableId ? { ...d, ...patch } : d);
      return {
        ...prev,
        phases: prev.phases.map((phase) => ({
          ...phase,
          deliverables: (phase.deliverables ?? []).map(upd),
          workPackages: phase.workPackages.map((wp) => ({
            ...wp,
            deliverables: (wp.deliverables ?? []).map(upd),
          })),
        })),
        workPackages: prev.workPackages.map((wp) => ({
          ...wp,
          deliverables: (wp.deliverables ?? []).map(upd),
        })),
      };
    });
  };

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    fetchSummary();
  }, [projectId]);

  useEffect(() => {
    if (data?.project?.t0Date) setT0Value(data.project.t0Date.slice(0, 10));
    else if (data && !data.project.t0Date) setT0Value("");
  }, [data?.project?.t0Date]);

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !projectId) return;
    setImportError(null);
    setImportSuccess(null);
    setImporting(true);
    try {
      const result = await apiUpload<{ ok: boolean; created: { phases: number; workPackages: number; deliverables: number } }>(
        `/projects/${projectId}/summary/import-from-json`,
        file,
        "file"
      );
      setImportSuccess(result.created);
      fetchSummary();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Errore durante l'import");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const handleApplyT0 = async () => {
    if (!projectId || !t0Value || t0Saving) return;
    setT0Saving(true);
    setImportError(null);
    try {
      await apiPatch(`/projects/${projectId}/summary/t0`, { t0Date: t0Value });
      fetchSummary();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Errore aggiornamento T0");
    } finally {
      setT0Saving(false);
    }
  };

  const handleResetStructure = async () => {
    if (!projectId || !data) return;
    if (
      !confirm(
        "Eliminare tutte le fasi, i work package e i deliverable di questo progetto? I task e il resto del progetto non verranno modificati. L'operazione non si può annullare."
      )
    )
      return;
    setResetting(true);
    setImportError(null);
    setImportSuccess(null);
    try {
      await apiPost(`/projects/${projectId}/summary/reset-structure`);
      fetchSummary();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Errore durante il reset");
    } finally {
      setResetting(false);
    }
  };

  if (!projectId) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] p-6 max-w-md">
        <p className="text-[var(--accent)] font-medium mb-2">Nessun progetto selezionato.</p>
        <p className="text-sm text-[var(--muted)] mb-4">Seleziona un progetto dalla lista o creane uno nuovo.</p>
        <Link to="/" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
          Torna ai progetti
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[280px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] p-6 max-w-md">
        <p className="text-[var(--accent)] font-medium mb-1">Impossibile caricare il riepilogo.</p>
        {summaryError && <p className="text-sm text-[var(--muted)] mb-4">{summaryError}</p>}
        <p className="text-sm text-[var(--muted)] mb-4">
          Verifica che il backend sia avviato e che il database sia aggiornato (es. <code className="text-xs bg-[var(--surface)] px-1 rounded">npx prisma migrate deploy</code> e <code className="text-xs bg-[var(--surface)] px-1 rounded">npx prisma generate</code>).
        </p>
        <button type="button" onClick={fetchSummary} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
          Riprova
        </button>
      </div>
    );
  }

  const project = data.project ?? { id: projectId, name: "", t0Date: null };
  const analytics = data.analytics ?? {
    totalTasks: 0,
    byColumn: [],
    overdueCount: 0,
    upcomingCount: 0,
    completedCount: 0,
    totalDiaryEntries: 0,
  };
  const overdue = data.overdue ?? [];
  const upcoming = data.upcoming ?? [];
  const phases = data.phases ?? [];
  const workPackages = data.workPackages ?? [];
  const completed = data.completed ?? [];
  const futureEvents = data.futureEvents ?? [];
  const projectName = projectNameFromStore ?? project.name;

  const nextEvent = futureEvents.length > 0 ? futureEvents[0] : null;

  return (
    <div className="space-y-8">
      {/* Avviso evento futuro in evidenza in alto */}
      {nextEvent && (
        <Link
          to={`/project/${projectId}/calendar`}
          className="flex items-center gap-3 rounded-xl border border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-900/30 px-4 py-3 hover:bg-sky-100/80 dark:hover:bg-sky-900/50 transition-colors"
        >
          <CalendarIcon className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-sky-600 dark:text-sky-400 uppercase tracking-wider">
              Prossimo evento
            </p>
            <p className="font-medium text-[var(--accent)] truncate">{nextEvent.name}</p>
          </div>
          <span className="text-sm text-sky-600 dark:text-sky-400 tabular-nums shrink-0">
            {format(new Date(nextEvent.date), "EEE d MMM", { locale: it })}
            {nextEvent.time ? ` · ${nextEvent.time}` : ""}
          </span>
          <ChevronRight className="w-4 h-4 text-sky-500 shrink-0" />
        </Link>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-[var(--accent)] mb-1">Riepilogo</h2>
          <p className="text-sm text-[var(--muted)]">{projectName}</p>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium cursor-pointer hover:bg-indigo-700 transition-colors">
              <Upload className="w-4 h-4" />
              {importing ? "Caricamento..." : "Importa da JSON"}
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                disabled={importing}
                onChange={handleImportJson}
              />
            </label>
            <button
              type="button"
              onClick={handleResetStructure}
              disabled={resetting || (phases.length === 0 && workPackages.length === 0)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-4 h-4" />
              {resetting ? "Reset..." : "Resetta fasi e WP"}
            </button>
          </div>
          {importError && <p className="text-sm text-red-600 dark:text-red-400">{importError}</p>}
          {importSuccess && (
            <p className="text-sm text-green-600 dark:text-green-400">
              Importati: {importSuccess.phases} fasi, {importSuccess.workPackages} WP, {importSuccess.deliverables} deliverable.
            </p>
          )}
        </div>
      </div>

      {/* Data T0 (inizio progetto) */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] p-4">
        <h3 className="font-semibold text-[var(--accent)] mb-2">Data inizio progetto (T0)</h3>
        <p className="text-sm text-[var(--muted)] mb-3">
          Imposta la data di inizio progetto. Se hai importato un JSON con date relative (es. T0+3mesi), modificando qui il T0 e cliccando Applica tutte quelle date verranno ricalcolate.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] focus-within:ring-2 focus-within:ring-indigo-500">
            <CalendarIcon className="w-5 h-5 text-indigo-500 dark:text-indigo-400 shrink-0" aria-hidden />
            <input
              type="date"
              value={t0Value}
              onChange={(e) => setT0Value(e.target.value)}
              className="bg-transparent border-0 p-0 text-[var(--accent)] focus:outline-none min-w-0 [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>
          <button
            type="button"
            onClick={handleApplyT0}
            disabled={!t0Value || t0Saving}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t0Saving ? "Applicazione..." : "Applica"}
          </button>
        </div>
      </section>

      {/* Analytics */}
      <section>
        <h3 className="flex items-center gap-2 font-semibold text-[var(--accent)] mb-4">
          <LayoutDashboard className="w-4 h-4" />
          Analytics
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] p-4">
            <p className="text-2xl font-bold text-[var(--accent)]">{analytics.totalTasks}</p>
            <p className="text-xs text-[var(--muted)]">Task totali</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] p-4">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{analytics.overdueCount}</p>
            <p className="text-xs text-[var(--muted)]">In ritardo</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] p-4">
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{analytics.upcomingCount}</p>
            <p className="text-xs text-[var(--muted)]">In scadenza</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] p-4">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{analytics.completedCount}</p>
            <p className="text-xs text-[var(--muted)]">Completati</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] p-4">
            <p className="text-2xl font-bold text-[var(--accent)]">{analytics.totalDiaryEntries}</p>
            <p className="text-xs text-[var(--muted)]">
              <BookOpen className="w-3.5 h-3.5 inline mr-0.5" />
              Resoconti diario
            </p>
          </div>
        </div>

        {/* Grafici */}
        {((phases?.length ?? 0) > 0 || analytics.byColumn.length > 0) && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gantt: fasi e work package */}
            {phases && phases.length > 0 && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] p-4">
                <p className="text-sm font-medium text-[var(--accent)] mb-3">Timeline progetto (Gantt)</p>
                <ProjectGantt phases={phases} />
              </div>
            )}

            {/* Barre: Task per colonna */}
            {analytics.byColumn.length > 0 && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] p-4">
                <p className="text-sm font-medium text-[var(--accent)] mb-3">Task per colonna</p>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analytics.byColumn.map((col) => ({ name: col.name, task: col.count }))}
                      layout="vertical"
                      margin={{ top: 4, right: 24, left: 4, bottom: 4 }}
                    >
                      <XAxis type="number" allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 12 }} />
                      <YAxis type="category" dataKey="name" width={80} tick={{ fill: "var(--accent-soft)", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--surface)",
                          border: "1px solid var(--border)",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number | undefined) => [value ?? 0, "task"]}
                        labelFormatter={(label) => `Colonna: ${label}`}
                      />
                      <Bar dataKey="task" fill="rgb(99 102 241)" radius={[0, 4, 4, 0]} name="Task" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {analytics.byColumn.length > 0 && (
          <div className="mt-4 rounded-xl border border-[var(--border)] overflow-hidden">
            <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider px-4 py-2 bg-[var(--surface-hover)]">
              Task per colonna (dettaglio)
            </p>
            <ul className="divide-y divide-[var(--border)]">
              {analytics.byColumn.map((col) => (
                <li key={col.id} className="flex items-center justify-between px-4 py-2">
                  <span className="text-[var(--accent)]">{col.name}</span>
                  <span className="font-medium text-[var(--accent)]">{col.count}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Scadenze: in ritardo + in scadenza */}
      <section>
        <h3 className="flex items-center gap-2 font-semibold text-[var(--accent)] mb-4">
          <CalendarIcon className="w-4 h-4" />
          Scadenze
        </h3>
        {overdue.length > 0 && (
          <div className="mb-6">
            <p className="flex items-center gap-1.5 text-sm font-medium text-red-600 dark:text-red-400 mb-2">
              <AlertTriangle className="w-4 h-4" />
              In ritardo ({overdue.length})
            </p>
            <ul className="space-y-2">
              {overdue.map((t) => (
                <li key={t.id}>
                  <Link
                    to={`/project/${projectId}/board`}
                    className="flex items-center gap-3 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10 px-3 py-2 hover:bg-red-100/50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <span className="flex-1 min-w-0 font-medium text-[var(--accent)] truncate text-sm">{t.title}</span>
                    <span className="w-24 shrink-0 text-right text-sm text-red-600 dark:text-red-400 tabular-nums">
                      {format(new Date(t.dueDate), "d MMM yyyy", { locale: it })}
                    </span>
                    <ChevronRight className="w-4 h-4 shrink-0 text-[var(--muted)]" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        {upcoming.length > 0 && (
          <div>
            <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] mb-2">
              Prossime scadenze
            </p>
            <ul className="space-y-2">
              {upcoming.slice(0, 10).map((t) => (
                <li key={t.id}>
                  <Link
                    to={`/project/${projectId}/board`}
                    className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-hover)] px-3 py-2 hover:bg-[var(--surface)] transition-colors"
                  >
                    <span className="flex-1 min-w-0 font-medium text-[var(--accent)] truncate text-sm">{t.title}</span>
                    <span className="w-24 shrink-0 text-right text-sm text-[var(--muted)] tabular-nums">
                      {format(new Date(t.dueDate), "d MMM yyyy", { locale: it })}
                    </span>
                    <ChevronRight className="w-4 h-4 shrink-0 text-[var(--muted)]" />
                  </Link>
                </li>
              ))}
            </ul>
            {upcoming.length > 10 && (
              <p className="text-xs text-[var(--muted)] mt-2">e altri {upcoming.length - 10} in scadenza</p>
            )}
          </div>
        )}
        {completed.length > 0 && (
          <div className="mt-6">
            <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-2">
              Completati ({completed.length})
            </p>
            <ul className="space-y-2">
              {completed.map((t) => (
                <li key={t.id}>
                  <Link
                    to={`/project/${projectId}/board`}
                    className="flex items-center gap-3 rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-900/10 px-3 py-2 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/20 transition-colors"
                  >
                    <span className="flex-1 min-w-0 font-medium text-[var(--accent)] truncate text-sm">{t.title}</span>
                    {t.dueDate && (
                      <span className="w-24 shrink-0 text-right text-sm text-[var(--muted)] tabular-nums">
                        {format(new Date(t.dueDate), "d MMM yyyy", { locale: it })}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 shrink-0 text-[var(--muted)]" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        {futureEvents.length > 0 && (
          <div className="mt-6">
            <p className="flex items-center gap-1.5 text-sm font-medium text-sky-600 dark:text-sky-400 mb-2">
              Eventi futuri (call / meeting)
            </p>
            <ul className="space-y-2">
              {futureEvents.map((ev) => (
                <li key={ev.id}>
                  <Link
                    to={`/project/${projectId}/calendar`}
                    className="flex items-center gap-3 rounded-lg border border-sky-200 dark:border-sky-800/50 bg-sky-50/60 dark:bg-sky-900/10 px-3 py-2 hover:bg-sky-100/50 dark:hover:bg-sky-900/20 transition-colors"
                  >
                    <span className="flex-1 min-w-0 font-medium text-[var(--accent)] truncate text-sm">{ev.name}</span>
                    <span className="w-24 shrink-0 text-right text-sm text-sky-600 dark:text-sky-400 tabular-nums">
                      {format(new Date(ev.date), "d MMM yyyy", { locale: it })}
                      {ev.time ? ` ${ev.time}` : ""}
                    </span>
                    <ChevronRight className="w-4 h-4 shrink-0 text-[var(--muted)]" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        {overdue.length === 0 && upcoming.length === 0 && completed.length === 0 && futureEvents.length === 0 && (
          <p className="text-sm text-[var(--muted)]">Nessuna scadenza impostata sui task e nessun evento futuro.</p>
        )}
      </section>

      {/* Fasi del progetto */}
      <section>
        <h3 className="flex items-center gap-2 font-semibold text-[var(--accent)] mb-4">
          <Layers className="w-4 h-4" />
          Fasi del progetto
        </h3>
        {phases.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            Nessuna fase definita. Aggiungi fasi dalla sezione Configurazione o dalla gestione del progetto.
          </p>
        ) : (
          <ul className="space-y-4">
            {phases.map((phase) => (
              <li
                key={phase.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                  <span className="font-medium text-[var(--accent)]">{phase.name}</span>
                  <span className="text-sm text-[var(--muted)]">
                    {phase.taskCount} task
                    {(phase.startDate || phase.endDate) && (
                      <> · {phase.startDate && format(new Date(phase.startDate), "d MMM yyyy", { locale: it })}
                        {phase.startDate && phase.endDate && " – "}
                        {phase.endDate && format(new Date(phase.endDate), "d MMM yyyy", { locale: it })}
                        {(phase.startDateRelative || phase.endDateRelative) && (
                          <span className="ml-1.5 text-[var(--accent-soft)]">
                            ({[phase.startDateRelative, phase.endDateRelative].filter(Boolean).join(" – ")})
                          </span>
                        )}
                      </>
                    )}
                  </span>
                </div>
                <div className="px-4 py-2 border-b border-[var(--border)]">
                  <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-2">Deliverable di fase</p>
                  <DeliverableTable
                    deliverables={phase.deliverables ?? []}
                    projectId={projectId}
                    phaseId={phase.id}
                    onUpdate={fetchSummary}
                    onConvertToTask={setDeliverableTaskId}
                    onRenameDeliverable={setDeliverableEdit}
                  />
                </div>
                {phase.workPackages.length > 0 && (
                  <ul className="px-4 py-2 divide-y divide-[var(--border)]">
                    {phase.workPackages.map((wp) => (
                      <li key={wp.id} className="py-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[var(--accent-soft)]">{wp.name}</span>
                          <span className="text-[var(--muted)]">{wp.taskCount} task</span>
                        </div>
                        <div className="mt-2 ml-3">
                          <DeliverableTable
                            deliverables={wp.deliverables ?? []}
                            compact
                            projectId={projectId}
                            workPackageId={wp.id}
                            onUpdate={fetchSummary}
                            onConvertToTask={setDeliverableTaskId}
                            onRenameDeliverable={setDeliverableEdit}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Work Package (tutti) */}
      <section>
        <h3 className="flex items-center gap-2 font-semibold text-[var(--accent)] mb-4">
          <Package className="w-4 h-4" />
          Work Package
        </h3>
        {workPackages.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            Nessun work package definito. Aggiungili dalla gestione del progetto.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {workPackages.map((wp) => (
              <li
                key={wp.id}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-hover)] px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-[var(--accent)]">{wp.name}</p>
                    {wp.phase && (
                      <p className="text-xs text-[var(--muted)]">Fase: {wp.phase.name}</p>
                    )}
                  </div>
                  <span className="text-sm font-medium text-[var(--accent)]">{wp.taskCount} task</span>
                </div>
                <div className="mt-3 pt-2 border-t border-[var(--border)]">
                  <DeliverableTable
                    deliverables={wp.deliverables ?? []}
                    compact
                    projectId={projectId}
                    workPackageId={wp.id}
                    onUpdate={fetchSummary}
                    onConvertToTask={setDeliverableTaskId}
                    onRenameDeliverable={setDeliverableEdit}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Gestione Fasi e Work Package */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] p-4">
        <h3 className="font-semibold text-[var(--accent)] mb-4">Gestione fasi e Work Package</h3>
        <PhaseAndWPManager projectId={projectId!} onUpdate={() => apiGet<ProjectSummaryType>(`/projects/${projectId}/summary`).then(setData)} />
      </section>
    </div>
  );
}

function PhaseAndWPManager({ projectId, onUpdate }: { projectId: string; onUpdate: () => void }) {
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>([]);
  const [phaseName, setPhaseName] = useState("");
  const [wpName, setWPName] = useState("");
  const [wpPhaseId, setWPPhaseId] = useState("");
  const [addingPhase, setAddingPhase] = useState(false);
  const [addingWP, setAddingWP] = useState(false);

  useEffect(() => {
    apiGet<ProjectPhase[]>(`/projects/${projectId}/phases`).then(setPhases).catch(() => {});
    apiGet<WorkPackage[]>(`/projects/${projectId}/work-packages`).then(setWorkPackages).catch(() => {});
  }, [projectId]);

  const addPhase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phaseName.trim() || addingPhase) return;
    setAddingPhase(true);
    try {
      await apiPost(`/projects/${projectId}/phases`, { name: phaseName.trim() });
      setPhaseName("");
      const list = await apiGet<ProjectPhase[]>(`/projects/${projectId}/phases`);
      setPhases(list);
      onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setAddingPhase(false);
    }
  };

  const addWP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wpName.trim() || addingWP) return;
    setAddingWP(true);
    try {
      await apiPost(`/projects/${projectId}/work-packages`, {
        name: wpName.trim(),
        phaseId: wpPhaseId || undefined,
      });
      setWPName("");
      setWPPhaseId("");
      const list = await apiGet<WorkPackage[]>(`/projects/${projectId}/work-packages`);
      setWorkPackages(list);
      onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setAddingWP(false);
    }
  };

  const deletePhase = async (phaseId: string) => {
    if (!confirm("Eliminare questa fase? I work package collegati non verranno eliminati.")) return;
    try {
      await apiDelete(`/projects/${projectId}/phases/${phaseId}`);
      setPhases((prev) => prev.filter((p) => p.id !== phaseId));
      onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteWP = async (wpId: string) => {
    if (!confirm("Eliminare questo work package?")) return;
    try {
      await apiDelete(`/projects/${projectId}/work-packages/${wpId}`);
      setWorkPackages((prev) => prev.filter((w) => w.id !== wpId));
      onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-[var(--muted)] mb-2">Aggiungi fase</p>
        <form onSubmit={addPhase} className="flex gap-2 flex-wrap">
          <input
            type="text"
            value={phaseName}
            onChange={(e) => setPhaseName(e.target.value)}
            placeholder="Nome fase"
            className="flex-1 min-w-[160px] px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--accent)] text-sm"
          />
          <button
            type="submit"
            disabled={!phaseName.trim() || addingPhase}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Aggiungi
          </button>
        </form>
        <ul className="mt-2 space-y-1">
          {phases.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-lg px-3 py-1.5 bg-[var(--surface)] text-sm">
              <span>{p.name}</span>
              <button type="button" onClick={() => deletePhase(p.id)} className="p-1 rounded text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30" aria-label="Elimina fase">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-sm text-[var(--muted)] mb-2">Aggiungi Work Package</p>
        <form onSubmit={addWP} className="flex flex-col sm:flex-row gap-2 flex-wrap">
          <input
            type="text"
            value={wpName}
            onChange={(e) => setWPName(e.target.value)}
            placeholder="Nome work package"
            className="flex-1 min-w-[160px] px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--accent)] text-sm"
          />
          <select
            value={wpPhaseId}
            onChange={(e) => setWPPhaseId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--accent)] text-sm max-w-[200px]"
          >
            <option value="">Nessuna fase</option>
            {phases.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!wpName.trim() || addingWP}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Aggiungi
          </button>
        </form>
        <ul className="mt-2 space-y-1">
          {workPackages.map((wp) => (
            <li key={wp.id} className="flex items-center justify-between rounded-lg px-3 py-1.5 bg-[var(--surface)] text-sm">
              <span>{wp.name}{wp.phase ? ` (${wp.phase.name})` : ""}</span>
              <button type="button" onClick={() => deleteWP(wp.id)} className="p-1 rounded text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30" aria-label="Elimina WP">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
