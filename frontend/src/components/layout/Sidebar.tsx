import { useState, useEffect, useRef } from "react";
import { NavLink, useParams, Link, useNavigate } from "react-router-dom";
import { LayoutDashboard, Calendar, Settings, FolderKanban, Plus, Trash2, X, ClipboardList, Pencil } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

const navItems = [
  { to: "summary", label: "Riepilogo", icon: ClipboardList },
  { to: "board", label: "Board", icon: LayoutDashboard },
  { to: "calendar", label: "Calendario", icon: Calendar },
  { to: "config", label: "Configurazione", icon: Settings },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open = true, onClose }: SidebarProps) {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { projects, fetchProjects, deleteProject, updateProject } = useAppStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (editingId) {
      setEditingName(projects.find((p) => p.id === editingId)?.name ?? "");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [editingId, projects]);

  const closeIfMobile = () => {
    onClose?.();
  };

  const handleStartRename = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(id);
  };

  const handleSaveRename = async () => {
    if (!editingId || !editingName.trim()) {
      setEditingId(null);
      return;
    }
    const name = editingName.trim();
    if (name === projects.find((p) => p.id === editingId)?.name) {
      setEditingId(null);
      return;
    }
    try {
      await updateProject(editingId, name);
      setEditingId(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      {/* Overlay su mobile quando sidebar aperta */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Chiudi menu"
        onClick={closeIfMobile}
        onKeyDown={(e) => e.key === "Enter" && closeIfMobile()}
        className={`fixed inset-0 z-30 bg-black/50 md:hidden transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />
      <aside
        className={`
          w-64 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] flex flex-col
          fixed md:relative inset-y-0 left-0 z-40 transform transition-transform duration-200 ease-out
          md:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-[var(--border)]">
          <Link
            to="/"
            onClick={closeIfMobile}
            className="font-semibold text-lg text-[var(--accent)] flex items-center gap-2 hover:opacity-90 min-h-[44px] items-center"
          >
            <FolderKanban className="w-6 h-6 text-indigo-500 shrink-0" />
            <span className="truncate">Gestione Progetti</span>
          </Link>
          <button
            type="button"
            onClick={closeIfMobile}
            className="md:hidden p-2.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Chiudi menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      <div className="p-3 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between px-2 mb-2">
          <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
            Progetti
          </p>
          <Link
            to="/"
            onClick={closeIfMobile}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors min-h-[44px] items-center touch-manipulation"
          >
            <Plus className="w-4 h-4" />
            Nuovo
          </Link>
        </div>
        <ul className="space-y-0.5">
          {projects.map((p) => {
            const isActive = projectId === p.id;
            const isEditing = editingId === p.id;
            return (
              <li key={p.id} className="group flex items-center gap-0.5">
                {isEditing ? (
                  <div className="flex-1 min-w-0 flex items-center gap-1 px-2 py-1.5 rounded-lg border border-indigo-500 bg-[var(--surface)]">
                    <input
                      ref={inputRef}
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveRename();
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      onBlur={handleSaveRename}
                      className="flex-1 min-w-0 px-2 py-1 rounded border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--accent)]"
                    />
                  </div>
                ) : (
                  <Link
                    to={`/project/${p.id}/summary`}
                    onClick={closeIfMobile}
                    className={`flex-1 min-w-0 block px-3 py-2.5 rounded-lg text-sm transition-colors border-l-4 min-h-[44px] flex items-center touch-manipulation ${
                      isActive
                        ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200 font-semibold border-indigo-500"
                        : "border-transparent text-[var(--accent-soft)] hover:bg-[var(--surface-hover)] hover:border-[var(--border)]"
                    }`}
                  >
                    <span className="truncate block">{p.name}</span>
                  </Link>
                )}
                {!isEditing && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => handleStartRename(e, p.id)}
                      className="p-2.5 rounded-lg text-[var(--muted)] hover:bg-indigo-100 hover:text-indigo-600 dark:hover:bg-indigo-900/30 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-opacity min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
                      aria-label="Rinomina progetto"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (confirm(`Eliminare il progetto "${p.name}"?`)) {
                          deleteProject(p.id);
                          if (projectId === p.id) navigate("/");
                        }
                      }}
                      className="p-2.5 rounded-lg text-[var(--muted)] hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-opacity min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
                      aria-label="Elimina progetto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
        {projectId && (
          <>
            <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider px-2 mt-6 mb-2">
              Vista
            </p>
            <ul className="space-y-0.5">
              {navItems.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={`/project/${projectId}/${to}`}
                    onClick={closeIfMobile}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors min-h-[44px] touch-manipulation ${
                        isActive
                          ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                          : "text-[var(--accent-soft)] hover:bg-[var(--surface-hover)]"
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </aside>
    </>
  );
}
