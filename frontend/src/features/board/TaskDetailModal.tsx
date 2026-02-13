import { useState, useEffect } from "react";
import { X, MessageSquare, Paperclip, Send, Trash2, Calendar } from "lucide-react";
import { apiGet, apiPost, apiPatch, apiDelete, apiUpload, uploadsUrl } from "@/api/client";
import type { Task, ProjectPhase, WorkPackage } from "@/types";
import { TASK_CATEGORIES } from "./CreateTaskForm";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface TaskDetailModalProps {
  projectId: string;
  task: Task;
  onClose: () => void;
  onUpdate: () => void;
}

export function TaskDetailModal({
  projectId,
  task,
  onClose,
  onUpdate,
}: TaskDetailModalProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [startDate, setStartDate] = useState(task.startDate ? task.startDate.slice(0, 10) : "");
  const [dueDate, setDueDate] = useState(task.dueDate ? task.dueDate.slice(0, 10) : "");
  const [phaseId, setPhaseId] = useState(task.phaseId ?? "");
  const [workPackageId, setWorkPackageId] = useState(task.workPackageId ?? "");
  const [category, setCategory] = useState(task.category ?? task.deliverable?.type ?? "");
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>([]);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    apiGet<ProjectPhase[]>(`/projects/${projectId}/phases`).then(setPhases).catch(() => {});
    apiGet<WorkPackage[]>(`/projects/${projectId}/work-packages`).then(setWorkPackages).catch(() => {});
  }, [projectId]);

  const saveTask = async () => {
    setSaving(true);
    try {
      await apiPatch(`/projects/${projectId}/tasks/${task.id}`, {
        title,
        description: description || undefined,
        startDate: startDate || null,
        dueDate: dueDate || null,
        phaseId: phaseId || null,
        workPackageId: workPackageId || null,
        category: category || null,
      });
      onUpdate();
    } finally {
      setSaving(false);
    }
  };

  const addComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      await apiPost(`/projects/${projectId}/tasks/${task.id}/comments`, {
        content: comment.trim(),
      });
      setComment("");
      onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      await apiUpload(
        `/projects/${projectId}/tasks/${task.id}/attachments`,
        file
      );
      onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeAttachment = async (attachmentId: string) => {
    try {
      await apiDelete(
        `/projects/${projectId}/tasks/${task.id}/attachments/${attachmentId}`
      );
      onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteTask = async () => {
    if (!confirm("Eliminare questo task? L’azione non si può annullare.")) return;
    try {
      await apiDelete(`/projects/${projectId}/tasks/${task.id}`);
      onUpdate();
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h3 className="font-semibold text-[var(--accent)]">Dettaglio task</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={deleteTask}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Elimina task
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[var(--surface-hover)]"
              aria-label="Chiudi"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--muted)] mb-1">
              Titolo
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTask}
              disabled={saving}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--muted)] mb-1">
              Descrizione
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={saveTask}
              disabled={saving}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--muted)] mb-1">Categoria (colore bordo)</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              onBlur={saveTask}
              disabled={saving}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {TASK_CATEGORIES.map((c) => (
                <option key={c.value || "none"} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Data inizio
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                onBlur={saveTask}
                disabled={saving}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1">Scadenza</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                onBlur={saveTask}
                disabled={saving}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          {phases.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1">Fase</label>
              <select
                value={phaseId}
                onChange={(e) => { setPhaseId(e.target.value); }}
                onBlur={saveTask}
                disabled={saving}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">— Nessuna —</option>
                {phases.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
          {workPackages.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1">Work Package</label>
              <select
                value={workPackageId}
                onChange={(e) => { setWorkPackageId(e.target.value); }}
                onBlur={saveTask}
                disabled={saving}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">— Nessuno —</option>
                {workPackages.map((wp) => (
                  <option key={wp.id} value={wp.id}>{wp.name}</option>
                ))}
              </select>
            </div>
          )}
          <p className="text-xs text-[var(--muted)]">
            Creato il {format(new Date(task.createdAt), "d MMMM yyyy, HH:mm", {
              locale: it,
            })}
          </p>

          {/* Allegati */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Paperclip className="w-4 h-4 text-[var(--muted)]" />
              <span className="font-medium text-[var(--accent)]">Allegati</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {task.attachments?.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-2 rounded-lg border border-[var(--border)] p-2 bg-[var(--surface-hover)]"
                >
                  <img
                    src={uploadsUrl(a.path)}
                    alt={a.filename}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="min-w-0">
                    <p className="text-sm truncate max-w-[120px]">{a.filename}</p>
                    <button
                      type="button"
                      onClick={() => removeAttachment(a.id)}
                      className="text-xs text-red-500 hover:underline flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Rimuovi
                    </button>
                  </div>
                </div>
              ))}
              <label className="flex items-center justify-center w-16 h-16 rounded-lg border-2 border-dashed border-[var(--border)] cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--muted)]">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={uploadFile}
                  disabled={uploading}
                />
                {uploading ? "..." : "+"}
              </label>
            </div>
          </div>

          {/* Commenti */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-[var(--muted)]" />
              <span className="font-medium text-[var(--accent)]">Commenti</span>
            </div>
            <ul className="space-y-2 mb-3">
              {task.comments?.map((c) => (
                <li
                  key={c.id}
                  className="rounded-lg bg-[var(--surface-hover)] px-3 py-2 text-sm"
                >
                  <p className="text-[var(--accent)]">{c.content}</p>
                  <p className="text-xs text-[var(--muted)] mt-1">
                    {format(new Date(c.createdAt), "d MMM HH:mm", {
                      locale: it,
                    })}
                  </p>
                </li>
              ))}
            </ul>
            <form onSubmit={addComment} className="flex gap-2">
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Scrivi un commento..."
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
      </div>
      <button
        type="button"
        className="absolute inset-0 -z-10"
        onClick={onClose}
        aria-label="Chiudi"
      />
    </div>
  );
}
