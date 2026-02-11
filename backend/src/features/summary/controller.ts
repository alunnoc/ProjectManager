import { Request, Response, NextFunction } from "express";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";

const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export async function getSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId } = req.params;
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        columns: { orderBy: { order: "asc" }, include: { _count: { select: { tasks: true } } } },
        phases: {
          orderBy: { sortOrder: "asc" },
          include: {
            workPackages: { orderBy: { sortOrder: "asc" }, include: { _count: { select: { tasks: true } } } },
            _count: { select: { tasks: true } },
          },
        },
        workPackages: {
          orderBy: { sortOrder: "asc" },
          include: { phase: true, _count: { select: { tasks: true } } },
        },
      },
    });
    if (!project) {
      next(new AppError(404, "Progetto non trovato", "NOT_FOUND"));
      return;
    }

    const tasks = await prisma.task.findMany({
      where: { projectId },
      include: { column: true, phase: true, workPackage: true },
    });

    const now = today();
    const isOverdue = (d: Date) => {
      const d0 = new Date(d);
      d0.setHours(0, 0, 0, 0);
      return d0 < now;
    };
    const overdue = tasks.filter((t) => t.dueDate && isOverdue(new Date(t.dueDate)));
    const upcoming = tasks
      .filter((t) => t.dueDate && !isOverdue(new Date(t.dueDate)))
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 20);

    const analytics = {
      totalTasks: tasks.length,
      byColumn: project.columns.map((c) => ({
        id: c.id,
        name: c.name,
        count: c._count.tasks,
      })),
      overdueCount: overdue.length,
      upcomingCount: tasks.filter((t) => t.dueDate && !isOverdue(new Date(t.dueDate))).length,
      totalDiaryEntries: await prisma.diaryEntry.count({ where: { projectId } }),
    };

    res.json({
      project: {
        id: project.id,
        name: project.name,
      },
      analytics,
      overdue: overdue.map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate,
        columnId: t.columnId,
        column: t.column,
        phase: t.phase,
        workPackage: t.workPackage,
      })),
      upcoming: upcoming.map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate,
        columnId: t.columnId,
        column: t.column,
        phase: t.phase,
        workPackage: t.workPackage,
      })),
      phases: project.phases.map((p) => ({
        id: p.id,
        name: p.name,
        sortOrder: p.sortOrder,
        startDate: p.startDate,
        endDate: p.endDate,
        taskCount: p._count.tasks,
        workPackages: p.workPackages.map((wp) => ({
          id: wp.id,
          name: wp.name,
          sortOrder: wp.sortOrder,
          taskCount: wp._count.tasks,
        })),
      })),
      workPackages: project.workPackages.map((wp) => ({
        id: wp.id,
        name: wp.name,
        sortOrder: wp.sortOrder,
        phaseId: wp.phaseId,
        phase: wp.phase,
        taskCount: wp._count.tasks,
      })),
    });
  } catch (e) {
    next(e);
  }
}
