import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/api/client";
import type { Guide, GuideStep } from "@/types";
import {
  BookOpen,
  Plus,
  X,
  Pencil,
  Trash2,
  ChevronRight,
  ListOrdered,
  ArrowLeft,
  Search,
} from "lucide-react";

export function Guides() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingGuide, setEditingGuide] = useState<Guide | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formSteps, setFormSteps] = useState<{ id?: string; title: string; content: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGuides = async (q?: string) => {
    setLoading(true);
    try {
      const params = q && q.length >= 2 ? `?q=${encodeURIComponent(q)}` : "";
      const data = await apiGet<Guide[]>(`/guides${params}`);
      setGuides(data);
    } catch (e) {
      console.error(e);
      setGuides([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(
      () => fetchGuides(searchQuery.length >= 2 ? searchQuery : undefined),
      300
    );
    return () => clearTimeout(t);
  }, [searchQuery]);

  const openCreate = () => {
    setEditingGuide(null);
    setFormTitle("");
    setFormDescription("");
    setFormSteps([{ title: "", content: "" }]);
    setShowForm(true);
    setError(null);
  };

  const openEdit = (g: Guide) => {
    setEditingGuide(g);
    setFormTitle(g.title);
    setFormDescription(g.description ?? "");
    setFormSteps(
      g.steps.length > 0
        ? g.steps.map((s) => ({ id: s.id, title: s.title, content: s.content ?? "" }))
        : [{ title: "", content: "" }]
    );
    setShowForm(true);
    setError(null);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingGuide(null);
  };

  const addStep = () => {
    setFormSteps((prev) => [...prev, { title: "", content: "" }]);
  };

  const removeStep = (i: number) => {
    setFormSteps((prev) => prev.filter((_, idx) => idx !== i));
  };

  const updateStep = (i: number, field: "title" | "content", value: string) => {
    setFormSteps((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!formTitle.trim()) {
      setError("Inserisci un titolo per la guida.");
      return;
    }
    const steps = formSteps.filter((s) => s.title.trim());
    if (steps.some((s) => !s.title.trim())) {
      setError("Ogni step deve avere un titolo.");
      return;
    }
    setSaving(true);
    try {
      if (editingGuide) {
        await apiPatch(`/guides/${editingGuide.id}`, {
          title: formTitle.trim(),
          description: formDescription.trim() || null,
        });
        const existingIds = new Set(editingGuide.steps.map((s) => s.id));
        const formIds = new Set(steps.map((s) => s.id).filter(Boolean));
        for (let i = 0; i < steps.length; i++) {
          const s = steps[i];
          if (s.id && existingIds.has(s.id)) {
            await apiPatch(`/guides/${editingGuide.id}/steps/${s.id}`, {
              title: s.title.trim(),
              content: s.content.trim() || null,
              order: i,
            });
          } else {
            await apiPost(`/guides/${editingGuide.id}/steps`, {
              title: s.title.trim(),
              content: s.content.trim() || undefined,
              order: i,
            });
          }
        }
        for (const step of editingGuide.steps) {
          if (!formIds.has(step.id)) {
            await apiDelete(`/guides/${editingGuide.id}/steps/${step.id}`);
          }
        }
      } else {
        await apiPost("/guides", {
          title: formTitle.trim(),
          description: formDescription.trim() || undefined,
          steps: steps.map((s, i) => ({
            title: s.title.trim(),
            content: s.content.trim() || undefined,
            order: i,
          })),
        });
      }
      closeForm();
      await fetchGuides();
      if (editingGuide) {
        const updated = await apiGet<Guide>(`/guides/${editingGuide.id}`);
        setSelectedGuide(updated);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nel salvataggio.");
    } finally {
      setSaving(false);
    }
  };

  const deleteGuide = async (g: Guide) => {
    if (!confirm(`Eliminare la guida "${g.title}"?`)) return;
    try {
      await apiDelete(`/guides/${g.id}`);
      if (selectedGuide?.id === g.id) setSelectedGuide(null);
      await fetchGuides();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
          <BookOpen className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-[var(--accent)]">Guide</h2>
          <p className="text-sm text-[var(--muted)]">Procedure e istruzioni per fare le cose</p>
        </div>
      </div>

      {selectedGuide ? (
        <div className="space-y-6">
          <button
            type="button"
            onClick={() => setSelectedGuide(null)}
            className="flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Torna all&apos;elenco
          </button>

          <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
            <div className="p-6 md:p-8 border-b border-[var(--border)] bg-gradient-to-br from-emerald-50/80 to-transparent dark:from-emerald-900/10 dark:to-transparent">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-[var(--accent)]">
                    {selectedGuide.title}
                  </h1>
                  {selectedGuide.description && (
                    <p className="mt-2 text-[var(--accent-soft)]">{selectedGuide.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(selectedGuide)}
                    className="p-2 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                    aria-label="Modifica"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteGuide(selectedGuide)}
                    className="p-2 rounded-lg text-[var(--muted)] hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600"
                    aria-label="Elimina"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8">
              {selectedGuide.steps.length === 0 ? (
                <p className="text-sm text-[var(--muted)] italic">
                  Nessuno step. Modifica la guida per aggiungere i passaggi.
                </p>
              ) : (
                <div className="relative">
                  {/* Linea verticale schematica */}
                  <div
                    className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-emerald-200 dark:bg-emerald-800/50 rounded-full"
                    aria-hidden
                  />
                  <ul className="space-y-0">
                    {selectedGuide.steps.map((step, i) => (
                      <li key={step.id} className="relative flex gap-6 pb-8 last:pb-0">
                        <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-bold z-10">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <h3 className="font-semibold text-[var(--accent)] text-base">
                            {step.title}
                          </h3>
                          {step.content && (
                            <p className="mt-2 text-sm text-[var(--accent-soft)] whitespace-pre-wrap leading-relaxed">
                              {step.content}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </article>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca nelle guide (titolo, descrizione, passaggi)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--accent)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              type="button"
              onClick={openCreate}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              Nuova guida
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-[var(--muted)]">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm">Caricamento...</p>
            </div>
          ) : guides.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-hover)]/30 p-12 text-center">
              <BookOpen className="w-12 h-12 mx-auto text-[var(--muted)] opacity-50 mb-4" />
              <p className="font-medium text-[var(--accent)]">
                {searchQuery.length >= 2 ? "Nessun risultato" : "Nessuna guida"}
              </p>
              <p className="text-sm text-[var(--muted)] mt-1 mb-6">
                {searchQuery.length >= 2
                  ? "Prova con altri termini di ricerca."
                  : "Crea la tua prima guida per documentare procedure e istruzioni."}
              </p>
              {searchQuery.length < 2 && (
                <button
                  type="button"
                  onClick={openCreate}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Crea guida
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {guides.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedGuide(g)}
                  className="group text-left rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-[var(--accent)] group-hover:text-emerald-700 dark:group-hover:text-emerald-400 truncate">
                        {g.title}
                      </h3>
                      {g.description && (
                        <p className="mt-1 text-sm text-[var(--muted)] line-clamp-2">
                          {g.description}
                        </p>
                      )}
                      <div className="mt-3 flex items-center gap-2 text-xs text-[var(--muted)]">
                        <ListOrdered className="w-3.5 h-3.5" />
                        <span>{g.steps.length} passaggi</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[var(--muted)] group-hover:text-emerald-500 shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal form */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={closeForm}
        >
          <div
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)] shrink-0">
              <h3 className="font-semibold text-[var(--accent)]">
                {editingGuide ? "Modifica guida" : "Nuova guida"}
              </h3>
              <button
                type="button"
                onClick={closeForm}
                className="p-2 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={submitForm} className="flex-1 overflow-y-auto p-4 space-y-4">
              {error && (
                <div className="rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm px-3 py-2">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">Titolo *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="es. Come configurare il deploy"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                  Descrizione (opzionale)
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Breve descrizione della guida"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--accent)] resize-none"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-[var(--muted)]">Passaggi</label>
                  <button
                    type="button"
                    onClick={addStep}
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    + Aggiungi step
                  </button>
                </div>
                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                  {formSteps.map((step, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-[var(--border)] p-3 bg-[var(--surface-hover)]/30 min-w-0"
                    >
                      <div className="flex items-center gap-2 mb-2 min-w-0">
                        <span className="text-xs font-medium text-[var(--muted)] w-6 shrink-0">
                          {i + 1}.
                        </span>
                        <input
                          type="text"
                          value={step.title}
                          onChange={(e) => updateStep(i, "title", e.target.value)}
                          placeholder="Titolo step"
                          className="flex-1 min-w-0 px-2 py-1.5 rounded border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--accent)]"
                        />
                        {formSteps.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeStep(i)}
                            className="p-1.5 rounded text-[var(--muted)] hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="pl-8 min-w-0">
                        <textarea
                          value={step.content}
                          onChange={(e) => updateStep(i, "content", e.target.value)}
                          placeholder="Istruzioni dettagliate..."
                          rows={2}
                          className="w-full min-w-0 px-2 py-1.5 rounded border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--accent)] resize-none box-border"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium disabled:opacity-50"
                >
                  {saving ? "Salvataggio..." : "Salva"}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2.5 rounded-lg bg-[var(--surface-hover)] text-[var(--accent)]"
                >
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
