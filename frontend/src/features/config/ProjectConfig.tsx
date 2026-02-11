import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/api/client";
import type { ProjectConfigSection, ProjectLink, SectionTypeOption } from "@/types";
import {
  Settings,
  Plus,
  ExternalLink,
  FolderGit2,
  Pencil,
  Trash2,
  LayoutList,
} from "lucide-react";

const SECTION_TYPES: SectionTypeOption[] = [
  { slug: "links", label: "Risorse e link" },
  { slug: "repo", label: "Repository" },
  { slug: "docs", label: "Documentazione" },
  { slug: "other", label: "Altro (personalizzato)" },
];

export function ProjectConfig() {
  const { projectId } = useParams<{ projectId: string }>();
  const [sections, setSections] = useState<ProjectConfigSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [showAddSection, setShowAddSection] = useState(false);
  const [addSectionName, setAddSectionName] = useState("");
  const [addSectionType, setAddSectionType] = useState<string>("links");
  const [savingSection, setSavingSection] = useState(false);
  const [sectionError, setSectionError] = useState<string | null>(null);

  const fetchSections = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await apiGet<ProjectConfigSection[]>(`/projects/${projectId}/sections`);
      setSections(data);
      if (data.length > 0 && !activeSectionId) setActiveSectionId(data[0].id);
      if (data.length > 0 && activeSectionId && !data.some((s) => s.id === activeSectionId))
        setActiveSectionId(data[0].id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSections();
  }, [projectId]);

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || savingSection) return;
    const name =
      addSectionType === "other" ? addSectionName.trim() : SECTION_TYPES.find((t) => t.slug === addSectionType)?.label ?? addSectionName.trim();
    if (!name) return;
    setSectionError(null);
    setSavingSection(true);
    try {
      const section = await apiPost<ProjectConfigSection>(`/projects/${projectId}/sections`, {
        name,
        typeSlug: addSectionType === "other" ? null : addSectionType,
      });
      setSections((prev) => [...prev, section]);
      setActiveSectionId(section.id);
      setShowAddSection(false);
      setAddSectionName("");
      setAddSectionType("links");
    } catch (err) {
      setSectionError(err instanceof Error ? err.message : "Impossibile creare la sezione. Verifica che il backend sia avviato.");
      console.error(err);
    } finally {
      setSavingSection(false);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!projectId || !confirm("Eliminare questa sezione e tutti i suoi link?")) return;
    try {
      await apiDelete(`/projects/${projectId}/sections/${sectionId}`);
      setSections((prev) => prev.filter((s) => s.id !== sectionId));
      if (activeSectionId === sectionId) setActiveSectionId(sections[0]?.id ?? null);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeSection = sections.find((s) => s.id === activeSectionId);

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-[var(--accent)]">
            Configurazione
          </h2>
          <p className="text-sm text-[var(--muted)]">
            Sezioni personalizzabili: risorse, repository, documentazione o altro. Ogni sezione contiene link o solo nomi.
          </p>
        </div>
      </div>

      {/* Tab sezioni */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActiveSectionId(s.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeSectionId === s.id
                ? "bg-indigo-600 text-white"
                : "bg-[var(--surface-hover)] text-[var(--accent-soft)] hover:bg-indigo-100 dark:hover:bg-indigo-900/30"
            }`}
          >
            <LayoutList className="w-4 h-4" />
            {s.name}
          </button>
        ))}
        {!showAddSection && (
          <button
            type="button"
            onClick={() => setShowAddSection(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed border-[var(--border)] text-[var(--muted)] hover:border-indigo-400 hover:text-indigo-600 text-sm"
          >
            <Plus className="w-4 h-4" />
            Aggiungi sezione
          </button>
        )}
      </div>

      {showAddSection && (
        <form
          onSubmit={handleAddSection}
          className="mb-6 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)]/50 space-y-3"
        >
          {sectionError && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {sectionError}
            </p>
          )}
          <div>
            <label className="block text-xs font-medium text-[var(--muted)] mb-1">
              Tipo di sezione
            </label>
            <select
              value={addSectionType}
              onChange={(e) => setAddSectionType(e.target.value)}
              className="w-full max-w-xs px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {SECTION_TYPES.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          {addSectionType === "other" && (
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                Nome personalizzato
              </label>
              <input
                type="text"
                value={addSectionName}
                onChange={(e) => setAddSectionName(e.target.value)}
                placeholder="Es. Contatti, Drive, ecc."
                className="w-full max-w-xs px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--accent)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={savingSection || (addSectionType === "other" && !addSectionName.trim())}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {savingSection ? "Salvataggio…" : "Crea sezione"}
            </button>
            <button
              type="button"
              onClick={() => { setShowAddSection(false); setAddSectionName(""); setAddSectionType("links"); setSectionError(null); }}
              className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--accent)] text-sm"
            >
              Annulla
            </button>
          </div>
        </form>
      )}

      {/* Contenuto sezione attiva */}
      {activeSection && (
        <SectionContent
          projectId={projectId!}
          section={activeSection}
          onDeleteSection={() => handleDeleteSection(activeSection.id)}
          onUpdate={fetchSections}
        />
      )}

      {sections.length === 0 && !showAddSection && (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-12 text-center text-[var(--muted)]">
          <LayoutList className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">Nessuna sezione</p>
          <p className="text-sm mt-1">Aggiungi una sezione per organizzare link e risorse del progetto.</p>
          <button
            type="button"
            onClick={() => setShowAddSection(true)}
            className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700"
          >
            Aggiungi sezione
          </button>
        </div>
      )}
    </div>
  );
}

interface SectionContentProps {
  projectId: string;
  section: ProjectConfigSection;
  onDeleteSection: () => void;
  onUpdate: () => void;
}

function SectionContent({ projectId, section, onDeleteSection, onUpdate }: SectionContentProps) {
  const [showForm, setShowForm] = useState(false);
  const [formLabel, setFormLabel] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const links = section.links ?? [];

  const resetForm = () => {
    setFormLabel("");
    setFormUrl("");
    setShowForm(false);
    setEditingId(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLabel.trim() || saving) return;
    setSaving(true);
    try {
      await apiPost(`/projects/${projectId}/sections/${section.id}/links`, {
        label: formLabel.trim(),
        url: formUrl.trim() || undefined,
      });
      resetForm();
      onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (link: ProjectLink) => {
    setEditingId(link.id);
    setFormLabel(link.label);
    setFormUrl(link.url ?? "");
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !formLabel.trim() || saving) return;
    setSaving(true);
    try {
      await apiPatch(`/projects/${projectId}/sections/${section.id}/links/${editingId}`, {
        label: formLabel.trim(),
        url: formUrl.trim() || null,
      });
      resetForm();
      onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!confirm("Rimuovere questo link?")) return;
    try {
      await apiDelete(`/projects/${projectId}/sections/${section.id}/links/${linkId}`);
      onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
        <h3 className="font-medium text-[var(--accent)]">{section.name}</h3>
        <div className="flex items-center gap-2">
          {!showForm && !editingId && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4" />
              Aggiungi
            </button>
          )}
          <button
            type="button"
            onClick={onDeleteSection}
            className="p-2 rounded-lg text-[var(--muted)] hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
            aria-label="Elimina sezione"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="p-6 space-y-4">
        {showForm && (
          <form onSubmit={handleCreate} className="p-4 rounded-xl bg-[var(--surface-hover)]/50 border border-[var(--border)] space-y-3">
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1">Etichetta</label>
              <input
                type="text"
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                placeholder="Nome o descrizione"
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1">URL (opzionale)</label>
              <input
                type="url"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-50">
                {saving ? "Salvataggio…" : "Salva"}
              </button>
              <button type="button" onClick={resetForm} className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--accent)] text-sm">
                Annulla
              </button>
            </div>
          </form>
        )}

        {links.length === 0 && !showForm && (
          <p className="text-[var(--muted)] py-6 text-center text-sm">Nessuna voce in questa sezione. Aggiungine una.</p>
        )}

        <ul className="space-y-2">
          {links.map((link) => (
            <li key={link.id}>
              {editingId === link.id ? (
                <form onSubmit={handleUpdate} className="p-4 rounded-xl bg-[var(--surface-hover)]/50 border border-[var(--border)] space-y-3">
                  <input
                    type="text"
                    value={formLabel}
                    onChange={(e) => setFormLabel(e.target.value)}
                    placeholder="Etichetta"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <input
                    type="url"
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    placeholder="URL (opzionale)"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="flex gap-2">
                    <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-50">
                      {saving ? "Salvataggio…" : "Salva"}
                    </button>
                    <button type="button" onClick={resetForm} className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--accent)] text-sm">
                      Annulla
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)]/30 hover:border-indigo-200 dark:hover:border-indigo-800/50">
                  <div className="shrink-0 p-2 rounded-lg bg-[var(--surface)] text-[var(--muted)]">
                    {link.url ? <ExternalLink className="w-4 h-4" /> : <FolderGit2 className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[var(--accent)]">{link.label}</p>
                    {link.url ? (
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline truncate block">
                        {link.url}
                      </a>
                    ) : (
                      <p className="text-sm text-[var(--muted)]">Solo nome</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => startEdit(link)} className="p-2 rounded-lg text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--accent)]" aria-label="Modifica">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => handleDeleteLink(link.id)} className="p-2 rounded-lg text-[var(--muted)] hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30" aria-label="Elimina">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
