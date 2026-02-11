/**
 * Tipi condivisi (allineati al backend / Prisma)
 */

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  columns?: BoardColumn[];
  _count?: { tasks: number; diaryEntries: number };
}

export interface BoardColumn {
  id: string;
  name: string;
  order: number;
  projectId: string;
  tasks?: Task[];
  _count?: { tasks: number };
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  order: number;
  columnId: string;
  projectId: string;
  startDate: string | null;
  dueDate: string | null;
  phaseId: string | null;
  workPackageId: string | null;
  createdAt: string;
  comments?: TaskComment[];
  attachments?: TaskAttachment[];
  column?: BoardColumn;
  project?: Project;
  phase?: ProjectPhase | null;
  workPackage?: WorkPackage | null;
}

export interface ProjectPhase {
  id: string;
  projectId: string;
  name: string;
  sortOrder: number;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  workPackages?: WorkPackage[];
  _count?: { tasks: number };
}

export interface WorkPackage {
  id: string;
  projectId: string;
  phaseId: string | null;
  name: string;
  sortOrder: number;
  createdAt: string;
  phase?: ProjectPhase | null;
  _count?: { tasks: number };
}

export interface TaskComment {
  id: string;
  content: string;
  taskId: string;
  createdAt: string;
}

export interface TaskAttachment {
  id: string;
  filename: string;
  path: string;
  taskId: string;
  uploadedAt: string;
}

export interface DiaryEntry {
  id: string;
  projectId: string;
  date: string;
  content: string | null;
  createdAt: string;
  images?: DiaryImage[];
  comments?: DiaryComment[];
}

export interface DiaryImage {
  id: string;
  diaryEntryId: string;
  filename: string;
  path: string;
  uploadedAt: string;
}

export interface DiaryComment {
  id: string;
  content: string;
  diaryEntryId: string;
  createdAt: string;
}

export interface ProjectEvent {
  id: string;
  projectId: string;
  date: string;
  time: string | null;
  type: string; // call | meeting | other
  name: string;
  notes: string | null;
  createdAt: string;
}

export interface SearchResult {
  tasks: Task[];
  diary: DiaryEntry[];
}

export interface ProjectConfigSection {
  id: string;
  projectId: string;
  name: string;
  typeSlug: string | null;
  order: number;
  createdAt: string;
  links?: ProjectLink[];
}

export interface ProjectLink {
  id: string;
  projectId: string;
  sectionId: string;
  label: string;
  url: string | null;
  order: number;
  createdAt: string;
}

export interface SectionTypeOption {
  slug: string;
  label: string;
}

export interface ProjectDeliverable {
  id: string;
  type: string; // document | block_diagram | prototype | report | other
  title: string;
  description: string | null;
  dueDate: string | null;
  dueDateRelative?: string | null;
  sortOrder: number;
  taskId?: string | null; // task creato da "Diventa task" (per evidenziare)
}

export interface ProjectSummary {
  project: { id: string; name: string; t0Date?: string | null };
  analytics: {
    totalTasks: number;
    byColumn: { id: string; name: string; count: number }[];
    overdueCount: number;
    upcomingCount: number;
    completedCount: number;
    totalDiaryEntries: number;
  };
  overdue: Array<{
    id: string;
    title: string;
    dueDate: string;
    columnId: string;
    column?: BoardColumn;
    phase?: ProjectPhase | null;
    workPackage?: WorkPackage | null;
  }>;
  completed: Array<{
    id: string;
    title: string;
    dueDate: string | null;
    columnId: string;
    column?: BoardColumn;
    phase?: ProjectPhase | null;
    workPackage?: WorkPackage | null;
  }>;
  upcoming: Array<{
    id: string;
    title: string;
    dueDate: string;
    columnId: string;
    column?: BoardColumn;
    phase?: ProjectPhase | null;
    workPackage?: WorkPackage | null;
  }>;
  futureEvents: Array<{
    id: string;
    date: string;
    time: string | null;
    type: string;
    name: string;
    notes: string | null;
  }>;
  phases: Array<{
    id: string;
    name: string;
    sortOrder: number;
    startDate: string | null;
    endDate: string | null;
    startDateRelative?: string | null;
    endDateRelative?: string | null;
    taskCount: number;
    deliverables?: ProjectDeliverable[];
    workPackages: Array<{
      id: string;
      name: string;
      sortOrder: number;
      taskCount: number;
      deliverables?: ProjectDeliverable[];
    }>;
  }>;
  workPackages: Array<{
    id: string;
    name: string;
    sortOrder: number;
    phaseId: string | null;
    phase?: ProjectPhase | null;
    taskCount: number;
    deliverables?: ProjectDeliverable[];
  }>;
}
