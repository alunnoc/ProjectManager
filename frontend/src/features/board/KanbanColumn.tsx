import { useDrop } from "react-dnd";
import type { BoardColumn } from "@/types";
import { TASK_TYPE } from "./ProjectBoard";

interface KanbanColumnProps {
  column: BoardColumn;
  onDrop: (taskId: string, index: number) => void;
  renderCreateTask: () => React.ReactNode;
  children: React.ReactNode;
}

export function KanbanColumn({
  column,
  onDrop,
  renderCreateTask,
  children,
}: KanbanColumnProps) {
  const tasks = column.tasks ?? [];
  const [{ isOver }, setNodeRef] = useDrop({
    accept: TASK_TYPE,
    drop: (item: { id: string; columnId: string }) => {
      if (item.columnId !== column.id) {
        onDrop(item.id, tasks.length);
      }
    },
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  });

  return (
    <div
      ref={setNodeRef}
      className={`w-[280px] min-w-[280px] md:w-72 md:min-w-0 shrink-0 rounded-xl border-2 transition-colors snap-start ${
        isOver
          ? "border-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10"
          : "border-[var(--border)] bg-[var(--surface-hover)]"
      }`}
    >
      <div className="p-3 border-b border-[var(--border)]">
        <h3 className="font-semibold text-[var(--accent)]">{column.name}</h3>
        <p className="text-xs text-[var(--muted)]">
          {(column.tasks?.length ?? column._count?.tasks ?? 0)} task
        </p>
      </div>
      <div className="p-2 flex flex-col gap-2 min-h-[200px]">
        {children}
        {renderCreateTask()}
      </div>
    </div>
  );
}
