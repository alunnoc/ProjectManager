import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FolderKanban, Trash2, Calendar, ListTodo } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { apiGet } from "@/api/client";
import type { ProjectEvent } from "@/types";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface NearestTask {
  id: string;
  title: string;
  dueDate: string;
}

export function ProjectSelect() {
  const navigate = useNavigate();
  const { projects, loading, createProject, deleteProject } = useAppStore();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventsByProject, setEventsByProject] = useState<Record<string, ProjectEvent[]>>({});
  const [nearestTasksByProject, setNearestTasksByProject] = useState<Record<string, NearestTask[]>>({});

  useEffect(() => {
    if (projects.length === 0) {
      setEventsByProject({});
      setNearestTasksByProject({});
      return;
    }
    let cancelled = false;
    const ids = projects.map((p) => p.id);
    Promise.all([
      Promise.all(ids.map((id) => apiGet<ProjectEvent[]>(`/projects/${id}/events/future`))),
      Promise.all(ids.map((id) => apiGet<NearestTask[]>(`/projects/${id}/tasks/nearest-due`))),
    ])
      .then(([eventsResults, tasksResults]) => {
        if (cancelled) return;
        const nextEvents: Record<string, ProjectEvent[]> = {};
        const nextTasks: Record<string, NearestTask[]> = {};
        ids.forEach((id, i) => {
          nextEvents[id] = eventsResults[i] ?? [];
          nextTasks[id] = tasksResults[i] ?? [];
        });
        setEventsByProject(nextEvents);
        setNearestTasksByProject(nextTasks);
      })
      .catch(() => {
        if (!cancelled) {
          setEventsByProject({});
          setNearestTasksByProject({});
        }
      });
    return () => {
      cancelled = true;
    };
  }, [projects]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || creating) return;
    setError(null);
    setCreating(true);
    try {
      const p = await createProject(name.trim());
      setName("");
      navigate(`/project/${p.id}/summary`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore durante la creazione";
      setError(message);
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full">
      <h2 className="text-xl md:text-2xl font-semibold text-[var(--accent)] mb-4 md:mb-6">
        I tuoi progetti
      </h2>
      <form onSubmit={handleCreate} className="flex flex-col gap-3 mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            placeholder="Nome nuovo progetto"
            className="flex-1 px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--accent)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base min-h-[44px] touch-manipulation"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!name.trim() || creating}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 min-h-[44px] touch-manipulation sm:max-w-[140px]"
          >
            {creating ? "Creazione…" : (
              <>
                <Plus className="w-4 h-4" />
                Crea
              </>
            )}
          </button>
        </div>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
      </form>
      {loading ? (
        <p className="text-[var(--muted)]">Caricamento...</p>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-dashed border-[var(--border)] text-[var(--muted)]">
          <FolderKanban className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Nessun progetto. Creane uno sopra.</p>
        </div>
      ) : (
        <ul className="grid gap-2">
          {projects.map((p) => {
            const futureEvents = eventsByProject[p.id] ?? [];
            const nearestTasks = nearestTasksByProject[p.id] ?? [];
            return (
              <li key={p.id}>
                <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] group">
                  <button
                    type="button"
                    onClick={() => navigate(`/project/${p.id}/summary`)}
                    className="flex-1 flex flex-col items-stretch px-4 py-3.5 sm:py-3 text-left min-w-0 min-h-[52px] touch-manipulation"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-[var(--accent)] truncate">{p.name}</span>
                      <span className="text-xs sm:text-sm text-[var(--muted)] shrink-0">
                        {p._count?.tasks ?? 0} task · {p._count?.diaryEntries ?? 0} resoconti
                      </span>
                    </div>
                    {nearestTasks.length > 0 && (
                      <div className="mt-2 flex gap-2">
                        <ListTodo className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" />
                        <ul className="text-xs text-[var(--muted)] space-y-0.5 min-w-0">
                          {nearestTasks.map((t) => (
                            <li key={t.id} className="truncate">
                              <span className="text-[var(--accent-soft)]">{t.title}</span>
                              <span className="text-indigo-600 dark:text-indigo-400 tabular-nums ml-1">
                                scadenza {format(new Date(t.dueDate), "d MMM yyyy", { locale: it })}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {futureEvents.length > 0 && (
                      <div className="mt-2 flex gap-2">
                        <Calendar className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 shrink-0 mt-0.5" />
                        <ul className="text-xs text-[var(--muted)] space-y-0.5 min-w-0">
                          {futureEvents.slice(0, 3).map((ev) => (
                            <li key={ev.id} className="truncate">
                              <span className="text-[var(--accent-soft)]">{ev.name}</span>
                              <span className="text-sky-600 dark:text-sky-400 tabular-nums ml-1">
                                {format(new Date(ev.date), "d MMM", { locale: it })}
                                {ev.time ? ` ${ev.time}` : ""}
                              </span>
                            </li>
                          ))}
                          {futureEvents.length > 3 && (
                            <li className="text-[var(--muted)]">+{futureEvents.length - 3} altri</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Eliminare il progetto "${p.name}"? Tutti i task, il diario e la configurazione saranno eliminati.`)) {
                        deleteProject(p.id);
                      }
                    }}
                    className="p-3 rounded-lg text-[var(--muted)] hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
                    aria-label="Elimina progetto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
