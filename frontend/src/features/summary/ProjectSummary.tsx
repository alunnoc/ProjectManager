import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/api/client";
import type { ProjectSummary as ProjectSummaryType, ProjectPhase, WorkPackage } from "@/types";
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
} from "lucide-react";

export function ProjectSummary() {
  const { projectId } = useParams<{ projectId: string }>();
  const [data, setData] = useState<ProjectSummaryType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    apiGet<ProjectSummaryType>(`/projects/${projectId}/summary`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-[var(--muted)]">
        Impossibile caricare il riepilogo.
      </div>
    );
  }

  const { project, analytics, overdue, upcoming, phases, workPackages } = data;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg md:text-xl font-semibold text-[var(--accent)] mb-1">Riepilogo</h2>
        <p className="text-sm text-[var(--muted)]">{project.name}</p>
      </div>

      {/* Analytics */}
      <section>
        <h3 className="flex items-center gap-2 font-semibold text-[var(--accent)] mb-4">
          <LayoutDashboard className="w-4 h-4" />
          Analytics
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
            <p className="text-2xl font-bold text-[var(--accent)]">{analytics.totalDiaryEntries}</p>
            <p className="text-xs text-[var(--muted)]">
              <BookOpen className="w-3.5 h-3.5 inline mr-0.5" />
              Resoconti diario
            </p>
          </div>
        </div>
        {analytics.byColumn.length > 0 && (
          <div className="mt-4 rounded-xl border border-[var(--border)] overflow-hidden">
            <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider px-4 py-2 bg-[var(--surface-hover)]">
              Task per colonna
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
                    className="flex items-center justify-between gap-2 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10 px-3 py-2 hover:bg-red-100/50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <span className="font-medium text-[var(--accent)] truncate">{t.title}</span>
                    <span className="text-xs text-red-600 dark:text-red-400 shrink-0">
                      {format(new Date(t.dueDate), "d MMM yyyy", { locale: it })}
                    </span>
                    <ChevronRight className="w-4 h-4 text-[var(--muted)] shrink-0" />
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
                    className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-hover)] px-3 py-2 hover:bg-[var(--surface)] transition-colors"
                  >
                    <span className="font-medium text-[var(--accent)] truncate">{t.title}</span>
                    <span className="text-xs text-[var(--muted)] shrink-0">
                      {format(new Date(t.dueDate), "d MMM yyyy", { locale: it })}
                    </span>
                    <ChevronRight className="w-4 h-4 text-[var(--muted)] shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
            {upcoming.length > 10 && (
              <p className="text-xs text-[var(--muted)] mt-2">e altri {upcoming.length - 10} in scadenza</p>
            )}
          </div>
        )}
        {overdue.length === 0 && upcoming.length === 0 && (
          <p className="text-sm text-[var(--muted)]">Nessuna scadenza impostata sui task.</p>
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
                      <> · {phase.startDate && format(new Date(phase.startDate), "d MMM", { locale: it })}
                        {phase.startDate && phase.endDate && " – "}
                        {phase.endDate && format(new Date(phase.endDate), "d MMM yyyy", { locale: it })}
                      </>
                    )}
                  </span>
                </div>
                {phase.workPackages.length > 0 && (
                  <ul className="px-4 py-2 divide-y divide-[var(--border)]">
                    {phase.workPackages.map((wp) => (
                      <li key={wp.id} className="flex items-center justify-between py-2 text-sm">
                        <span className="text-[var(--accent-soft)]">{wp.name}</span>
                        <span className="text-[var(--muted)]">{wp.taskCount} task</span>
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
                className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-hover)] px-4 py-3"
              >
                <div>
                  <p className="font-medium text-[var(--accent)]">{wp.name}</p>
                  {wp.phase && (
                    <p className="text-xs text-[var(--muted)]">Fase: {wp.phase.name}</p>
                  )}
                </div>
                <span className="text-sm font-medium text-[var(--accent)]">{wp.taskCount} task</span>
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
