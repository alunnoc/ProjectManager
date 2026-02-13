import { useDrag } from "react-dnd";
import { useParams } from "react-router-dom";
import { GripVertical, MessageSquare, Paperclip, Calendar } from "lucide-react";
import { format, isPast } from "date-fns";
import { it } from "date-fns/locale";
import type { Task } from "@/types";
import { TASK_TYPE } from "./ProjectBoard";
import { TaskDetailModal } from "./TaskDetailModal";
import { useState } from "react";

/** Colori bordo sinistro: palette differenziata per accessibilità (daltonismo: blu, bianco, arancione, rosso, slate, giallo, grigio) */
const DELIVERABLE_TYPE_BORDER: Record<string, string> = {
  document: "border-l-4 border-l-blue-500",       // blu
  block_diagram: "border-l-4 border-l-white",       // bianco
  prototype: "border-l-4 border-l-orange-500",     // arancione
  report: "border-l-4 border-l-red-500",          // rosso
  code: "border-l-4 border-l-slate-600",           // slate (scuro)
  test: "border-l-4 border-l-yellow-400",         // giallo
  other: "border-l-4 border-l-gray-500",          // grigio
};

const DELIVERABLE_TYPE_LABELS: Record<string, string> = {
  document: "Documento",
  block_diagram: "Block diagram",
  prototype: "Prototipo",
  report: "Report",
  code: "Codice",
  test: "Test",
  other: "Altro",
};

interface TaskCardProps {
  task: Task;
  index: number;
  onMove: (targetColumnId: string, targetIndex: number) => void;
  onUpdate: () => void;
}

export function TaskCard({ task, index, onMove: _onMove, onUpdate }: TaskCardProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const [detailOpen, setDetailOpen] = useState(false);

  const [{ isDragging }, drag, preview] = useDrag({
    type: TASK_TYPE,
    item: { id: task.id, columnId: task.columnId, index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const commentsCount = task.comments?.length ?? 0;
  const attachmentsCount = task.attachments?.length ?? 0;
  const hasDueDate = task.dueDate != null;
  const overdue = hasDueDate && isPast(new Date(task.dueDate!));
  const typeSlug = task.deliverable?.type ?? task.category ?? null;
  const typeBorderClass = typeSlug ? DELIVERABLE_TYPE_BORDER[typeSlug] ?? DELIVERABLE_TYPE_BORDER.other : "";
  const typeLabel = typeSlug ? DELIVERABLE_TYPE_LABELS[typeSlug] ?? typeSlug : null;

  return (
    <>
      <div
        ref={(node) => {
          drag(node);
          preview(node);
        }}
        className={`rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md ${typeBorderClass} ${
          isDragging ? "opacity-50 shadow-lg" : ""
        }`}
        onClick={() => setDetailOpen(true)}
        title={typeLabel ? (task.deliverable ? `Da deliverable: ${typeLabel}` : typeLabel) : undefined}
      >
        <div className="flex items-start gap-2">
          <GripVertical className="w-4 h-4 text-[var(--muted)] shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            {typeLabel && (
              <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)] leading-tight block mb-0.5">
                {typeLabel}
              </span>
            )}
            <p className="font-medium text-[var(--accent)] line-clamp-2">{task.title}</p>
            {task.description && (
              <p className="text-sm text-[var(--muted)] line-clamp-2 mt-1">
                {task.description}
              </p>
            )}
            <div className="flex items-center flex-wrap gap-2 mt-2 text-xs text-[var(--muted)]">
              {hasDueDate && (
                <span
                  className={`flex items-center gap-1 ${overdue ? "text-red-600 dark:text-red-400 font-medium" : ""}`}
                  title={overdue ? "Scaduta" : "Scadenza"}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  {format(new Date(task.dueDate!), "d MMM yyyy", { locale: it })}
                </span>
              )}
              {commentsCount > 0 && (
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {commentsCount}
                </span>
              )}
              {attachmentsCount > 0 && (
                <span className="flex items-center gap-1">
                  <Paperclip className="w-3.5 h-3.5" />
                  {attachmentsCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      {projectId && detailOpen && (
        <TaskDetailModal
          projectId={projectId}
          task={task}
          onClose={() => setDetailOpen(false)}
          onUpdate={onUpdate}
        />
      )}
    </>
  );
}
