import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FolderKanban, Trash2 } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

export function ProjectSelect() {
  const navigate = useNavigate();
  const { projects, loading, createProject, deleteProject } = useAppStore();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          {projects.map((p) => (
            <li key={p.id}>
              <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] group">
                <button
                  type="button"
                  onClick={() => navigate(`/project/${p.id}/summary`)}
                  className="flex-1 flex items-center justify-between px-4 py-3.5 sm:py-3 text-left min-w-0 min-h-[52px] touch-manipulation"
                >
                  <span className="font-medium text-[var(--accent)] truncate">{p.name}</span>
                  <span className="text-xs sm:text-sm text-[var(--muted)] shrink-0 ml-2">
                    {p._count?.tasks ?? 0} task · {p._count?.diaryEntries ?? 0} resoconti
                  </span>
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
          ))}
        </ul>
      )}
    </div>
  );
}
