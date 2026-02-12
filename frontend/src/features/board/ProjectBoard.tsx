import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { apiGet, apiPost } from "@/api/client";
import type { BoardColumn } from "@/types";
import { KanbanColumn } from "./KanbanColumn";
import { TaskCard } from "./TaskCard";
import { CreateTaskForm } from "./CreateTaskForm";
import { Loader2 } from "lucide-react";

const TASK_TYPE = "TASK";

export function ProjectBoard() {
  const { projectId } = useParams<{ projectId: string }>();
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBoard = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await apiGet<BoardColumn[]>(`/projects/${projectId}/board`);
      setColumns(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoard();
  }, [projectId]);

  const moveTask = async (taskId: string, columnId: string, order: number) => {
    if (!projectId) return;
    try {
      await apiPost(`/projects/${projectId}/tasks/${taskId}/move`, {
        columnId,
        order,
      });
      await fetchBoard();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDrop = (taskId: string, targetColumnId: string, index: number) => {
    moveTask(taskId, targetColumnId, index);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="h-full">
      <h2 className="text-lg md:text-xl font-semibold text-[var(--accent)] mb-4 md:mb-6">Board</h2>
      <DndProvider backend={HTML5Backend}>
        <div className="flex gap-3 md:gap-4 overflow-x-auto overflow-y-hidden pb-4 -mx-1 px-1 min-h-[calc(100vh-11rem)] md:min-h-[calc(100vh-12rem)] snap-x snap-mandatory">
          {columns.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              onDrop={(taskId, index) => handleDrop(taskId, col.id, index)}
              renderCreateTask={() =>
                projectId ? (
                  <CreateTaskForm
                    projectId={projectId}
                    columnId={col.id}
                    onCreated={fetchBoard}
                  />
                ) : null
              }
            >
              {(col.tasks ?? []).map((task, i) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={i}
                  onMove={(targetColId, targetIndex) =>
                    moveTask(task.id, targetColId, targetIndex)
                  }
                  onUpdate={fetchBoard}
                />
              ))}
            </KanbanColumn>
          ))}
        </div>
      </DndProvider>
    </div>
  );
}

export { TASK_TYPE };
