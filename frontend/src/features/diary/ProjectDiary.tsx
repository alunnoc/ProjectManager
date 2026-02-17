import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiGet, apiPost, apiPatch, apiDelete, apiUpload, uploadsUrl } from "@/api/client";
import type { DiaryEntry } from "@/types";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Plus, ImagePlus, MessageSquare, Trash2, Send, FileText } from "lucide-react";

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp|svg)$/i;
function isImageFile(filename: string) {
  return IMAGE_EXT.test(filename);
}
import { Loader2 } from "lucide-react";

export function ProjectDiary() {
  const { projectId } = useParams<{ projectId: string }>();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newDate, setNewDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [newContent, setNewContent] = useState("");

  const fetchEntries = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await apiGet<DiaryEntry[]>(`/projects/${projectId}/diary`);
      setEntries(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [projectId]);

  const createEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    try {
      await apiPost(`/projects/${projectId}/diary`, {
        date: newDate,
        content: newContent.trim() || undefined,
      });
      setNewContent("");
      setShowForm(false);
      fetchEntries();
    } catch (err) {
      console.error(err);
    }
  };

  const addImage = async (entryId: string, file: File) => {
    if (!projectId) return;
    try {
      await apiUpload(
        `/projects/${projectId}/diary/${entryId}/images`,
        file
      );
      fetchEntries();
    } catch (err) {
      console.error(err);
    }
  };

  const removeImage = async (entryId: string, imageId: string) => {
    if (!projectId) return;
    try {
      await apiDelete(
        `/projects/${projectId}/diary/${entryId}/images/${imageId}`
      );
      fetchEntries();
    } catch (err) {
      console.error(err);
    }
  };

  const addComment = async (
    entryId: string,
    content: string,
    clearInput: () => void
  ) => {
    if (!projectId || !content.trim()) return;
    try {
      await apiPost(`/projects/${projectId}/diary/${entryId}/comments`, {
        content: content.trim(),
      });
      clearInput();
      fetchEntries();
    } catch (err) {
      console.error(err);
    }
  };

  const updateEntryContent = async (entry: DiaryEntry, content: string) => {
    if (!projectId) return;
    try {
      await apiPatch(`/projects/${projectId}/diary/${entry.id}`, {
        content: content || undefined,
      });
      fetchEntries();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteEntry = async (entryId: string) => {
    if (!projectId || !confirm("Eliminare questo resoconto?")) return;
    try {
      await apiDelete(`/projects/${projectId}/diary/${entryId}`);
      fetchEntries();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h2 className="text-lg md:text-xl font-semibold text-[var(--accent)]">Diario</h2>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm"
        >
          <Plus className="w-4 h-4" />
          Nuovo resoconto
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={createEntry}
          className="mb-8 p-6 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-[var(--muted)] mb-1">
              Data
            </label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--accent)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--muted)] mb-1">
              Testo
            </label>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Cosa è successo oggi?"
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--accent)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Salva
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setNewContent(""); }}
              className="px-4 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--accent)]"
            >
              Annulla
            </button>
          </div>
        </form>
      )}

      <div className="space-y-8">
        {entries.length === 0 && !showForm && (
          <p className="text-[var(--muted)] py-12 text-center">
            Nessun resoconto. Aggiungine uno con il pulsante sopra.
          </p>
        )}
        {entries.map((entry) => (
          <DiaryEntryCard
            key={entry.id}
            entry={entry}
            onUpdateContent={(content) => updateEntryContent(entry, content)}
            onAddImage={(file) => addImage(entry.id, file)}
            onRemoveImage={(imageId) => removeImage(entry.id, imageId)}
            onAddComment={(content, clear) => addComment(entry.id, content, clear)}
            onDelete={() => deleteEntry(entry.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface DiaryEntryCardProps {
  entry: DiaryEntry;
  onUpdateContent: (content: string) => void;
  onAddImage: (file: File) => void;
  onRemoveImage: (imageId: string) => void;
  onAddComment: (content: string, clearInput: () => void) => void;
  onDelete: () => void;
}

function DiaryEntryCard({
  entry,
  onUpdateContent,
  onAddImage,
  onRemoveImage,
  onAddComment,
  onDelete,
}: DiaryEntryCardProps) {
  const [content, setContent] = useState(entry.content ?? "");
  const [comment, setComment] = useState("");

  const handleBlur = () => {
    if (content !== (entry.content ?? "")) {
      onUpdateContent(content);
    }
  };

  return (
    <article className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
        <time className="font-medium text-[var(--accent)]">
          {format(new Date(entry.date), "EEEE d MMMM yyyy", { locale: it })}
        </time>
        <button
          type="button"
          onClick={onDelete}
          className="p-2 rounded-lg text-[var(--muted)] hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
          aria-label="Elimina"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 space-y-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={handleBlur}
          placeholder="Scrivi il resoconto..."
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent text-[var(--accent)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />

        {/* Immagini e file */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ImagePlus className="w-4 h-4 text-[var(--muted)]" />
            <span className="text-sm font-medium text-[var(--accent)]">Immagini e file</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {entry.images?.map((img) =>
              isImageFile(img.filename) ? (
                <div key={img.id} className="relative group">
                  <img
                    src={uploadsUrl(img.path)}
                    alt={img.filename}
                    className="w-24 h-24 object-cover rounded-lg border border-[var(--border)]"
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveImage(img.id)}
                    className="absolute top-1 right-1 p-1 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div key={img.id} className="relative group flex items-center gap-2 min-w-0 max-w-[200px] rounded-lg border border-[var(--border)] bg-[var(--surface-hover)] pl-3 pr-8 py-2">
                  <FileText className="w-5 h-5 shrink-0 text-[var(--muted)]" />
                  <a
                    href={uploadsUrl(img.path)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-indigo-600 dark:text-indigo-400 truncate hover:underline"
                  >
                    {img.filename}
                  </a>
                  <button
                    type="button"
                    onClick={() => onRemoveImage(img.id)}
                    className="absolute top-1 right-1 p-1 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )
            )}
            <label className="flex items-center justify-center w-24 h-24 rounded-lg border-2 border-dashed border-[var(--border)] cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--muted)]">
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onAddImage(f);
                  e.target.value = "";
                }}
              />
              <ImagePlus className="w-8 h-8" />
            </label>
          </div>
        </div>

        {/* Commenti */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-[var(--muted)]" />
            <span className="text-sm font-medium text-[var(--accent)]">Commenti</span>
          </div>
          <ul className="space-y-2 mb-3">
            {entry.comments?.map((c) => (
              <li
                key={c.id}
                className="rounded-lg bg-[var(--surface-hover)] px-3 py-2 text-sm"
              >
                {c.content}
              </li>
            ))}
          </ul>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onAddComment(comment, () => setComment(""));
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Aggiungi commento..."
              className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent text-[var(--accent)] placeholder:text-[var(--muted)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={!comment.trim()}
              className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </article>
  );
}
