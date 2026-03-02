import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/api/client";
import { StickyNote, Plus, Pencil, Trash2, Check, X } from "lucide-react";

interface ProjectNote {
  id: string;
  projectId: string;
  title: string;
  content: string | null;
  sortOrder: number;
  createdAt: string;
}

export function ProjectNotes() {
  const { projectId } = useParams<{ projectId: string }>();
  const [notes, setNotes] = useState<ProjectNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await apiGet<ProjectNote[]>(`/projects/${projectId}/notes`);
      setNotes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [projectId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || saving || !newTitle.trim()) return;
    setError(null);
    setSaving(true);
    try {
      const note = await apiPost<ProjectNote>(`/projects/${projectId}/notes`, {
        title: newTitle.trim(),
        content: newContent.trim() || undefined,
      });
      setNotes((prev) => [...prev, note].sort((a, b) => a.sortOrder - b.sortOrder));
      setNewTitle("");
      setNewContent("");
      setShowAddForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante il salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!projectId || !confirm("Eliminare questo blocco di appunti?")) return;
    try {
      await apiDelete(`/projects/${projectId}/notes/${noteId}`);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
          <StickyNote className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-[var(--accent)]">Appunti</h2>
          <p className="text-sm text-[var(--muted)]">
            Blocchi di appunti per idee, riferimenti e note veloci del progetto.
          </p>
        </div>
      </div>

      {/* Griglia appunti */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {notes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            projectId={projectId!}
            onUpdate={fetchNotes}
            onDelete={() => handleDelete(note.id)}
          />
        ))}

        {/* Form aggiungi */}
        {showAddForm ? (
          <form
            onSubmit={handleAdd}
            className="rounded-2xl border-2 border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10 p-5 min-h-[180px] flex flex-col"
          >
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-2" role="alert">
                {error}
              </p>
            )}
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Titolo (es. Idee, Da fare…)"
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--accent)] font-medium placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-amber-500 mb-3"
              autoFocus
            />
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Contenuto…"
              rows={4}
              className="flex-1 min-h-[80px] w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--accent)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none text-sm"
            />
            <div className="flex gap-2 mt-3">
              <button
                type="submit"
                disabled={saving || !newTitle.trim()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {saving ? "Salvataggio…" : "Salva"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setNewTitle("");
                  setNewContent("");
                  setError(null);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--accent)] text-sm"
              >
                <X className="w-4 h-4" />
                Annulla
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-hover)]/50 hover:border-amber-400 hover:bg-amber-50/30 dark:hover:bg-amber-900/10 min-h-[180px] flex flex-col items-center justify-center gap-2 text-[var(--muted)] hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
          >
            <Plus className="w-10 h-10" />
            <span className="text-sm font-medium">Nuovo blocco</span>
          </button>
        )}
      </div>

      {notes.length === 0 && !showAddForm && (
        <div className="mt-8 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-12 text-center">
          <StickyNote className="w-12 h-12 mx-auto mb-3 text-amber-500/60" />
          <p className="font-medium text-[var(--accent)]">Nessun appunto</p>
          <p className="text-sm text-[var(--muted)] mt-1">
            Aggiungi un blocco per iniziare a prendere note veloci.
          </p>
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="mt-4 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Aggiungi blocco
          </button>
        </div>
      )}
    </div>
  );
}

interface NoteCardProps {
  note: ProjectNote;
  projectId: string;
  onUpdate: () => void;
  onDelete: () => void;
}

function NoteCard({ note, projectId, onUpdate, onDelete }: NoteCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(note.title);
    setContent(note.content ?? "");
  }, [note.title, note.content]);

  const handleSave = async () => {
    if (title.trim() === note.title && (content ?? "") === (note.content ?? "")) {
      setIsEditing(false);
      return;
    }
    setSaving(true);
    try {
      await apiPatch(`/projects/${projectId}/notes/${note.id}`, {
        title: title.trim(),
        content: content.trim() || null,
      });
      onUpdate();
      setIsEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleBlur = () => {
    if (isEditing) handleSave();
  };

  return (
    <article className="rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/60 dark:bg-amber-900/10 shadow-sm overflow-hidden min-h-[180px] flex flex-col group">
      <div className="p-4 flex-1 flex flex-col min-h-0">
        <div className="flex items-start justify-between gap-2 mb-2">
          {isEditing ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              className="flex-1 px-2 py-1 rounded-lg border border-amber-300 dark:border-amber-700 bg-[var(--surface)] text-[var(--accent)] font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              autoFocus
            />
          ) : (
            <h3 className="font-semibold text-amber-800 dark:text-amber-200 text-sm truncate flex-1">
              {note.title}
            </h3>
          )}
          <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-200/50 dark:hover:bg-amber-800/30"
                aria-label="Modifica"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-200/50 disabled:opacity-50"
                aria-label="Salva"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onDelete}
              className="p-1.5 rounded-lg text-[var(--muted)] hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
              aria-label="Elimina"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {isEditing ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={handleBlur}
            rows={5}
            className="flex-1 min-h-[100px] w-full px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-[var(--surface)] text-[var(--accent)] text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            placeholder="Scrivi qui…"
          />
        ) : (
          <div
            className="flex-1 text-sm text-[var(--accent-soft)] whitespace-pre-wrap overflow-y-auto min-h-0"
            onClick={() => setIsEditing(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setIsEditing(true)}
          >
            {content.trim() || (
              <span className="italic text-[var(--muted)]">Clicca per aggiungere contenuto…</span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
