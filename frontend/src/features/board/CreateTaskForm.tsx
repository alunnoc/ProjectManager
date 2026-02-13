import { useState } from "react";
import { Plus } from "lucide-react";
import { apiPost } from "@/api/client";

/** Categorie disponibili per il task (stesso elenco del backend, per colore bordo) */
export const TASK_CATEGORIES = [
  { value: "", label: "Nessuna" },
  { value: "document", label: "Documento" },
  { value: "block_diagram", label: "Block diagram" },
  { value: "prototype", label: "Prototipo" },
  { value: "report", label: "Report" },
  { value: "code", label: "Codice" },
  { value: "test", label: "Test" },
  { value: "other", label: "Altro" },
] as const;

interface CreateTaskFormProps {
  projectId: string;
  columnId: string;
  onCreated: () => void;
}

export function CreateTaskForm({ projectId, columnId, onCreated }: CreateTaskFormProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || loading) return;
    setLoading(true);
    try {
      await apiPost(`/projects/${projectId}/tasks`, {
        title: title.trim(),
        description: description.trim() || undefined,
        columnId,
        startDate: startDate || undefined,
        dueDate: dueDate || undefined,
        category: category || undefined,
      });
      setTitle("");
      setDescription("");
      setStartDate("");
      setDueDate("");
      setCategory("");
      setOpen(false);
      onCreated();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full py-2 rounded-lg border border-dashed border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--accent)] transition-colors text-sm"
      >
        <Plus className="w-4 h-4" />
        Aggiungi task
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 space-y-2">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titolo task"
        className="w-full px-3 py-2 rounded border border-[var(--border)] bg-transparent text-[var(--accent)] placeholder:text-[var(--muted)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        autoFocus
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Descrizione (opzionale)"
        rows={2}
        className="w-full px-3 py-2 rounded border border-[var(--border)] bg-transparent text-[var(--accent)] placeholder:text-[var(--muted)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
      />
      <div>
        <label className="block text-xs text-[var(--muted)] mb-0.5">Categoria (colore bordo)</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-2 py-1.5 rounded border border-[var(--border)] bg-transparent text-[var(--accent)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {TASK_CATEGORIES.map((c) => (
            <option key={c.value || "none"} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-[var(--muted)] mb-0.5">Inizio</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-2 py-1.5 rounded border border-[var(--border)] bg-transparent text-[var(--accent)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs text-[var(--muted)] mb-0.5">Scadenza</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-2 py-1.5 rounded border border-[var(--border)] bg-transparent text-[var(--accent)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!title.trim() || loading}
          className="px-3 py-1.5 rounded bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          Aggiungi
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setTitle(""); setDescription(""); setStartDate(""); setDueDate(""); setCategory(""); }}
          className="px-3 py-1.5 rounded bg-[var(--surface-hover)] text-[var(--accent)] text-sm"
        >
          Annulla
        </button>
      </div>
    </form>
  );
}
