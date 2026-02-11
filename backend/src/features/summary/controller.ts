import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";
import { parseDateOrRelative, parseRelativeDate } from "../../lib/relativeDate.js";

// Schema JSON per import (accetta date assolute YYYY-MM-DD o relative T0, T0+Nmesi, ecc.)
const DELIVERABLE_TYPES = ["document", "block_diagram", "prototype", "report", "other"] as const;
const dateOrRelativeSchema = z.string().min(1).max(50).optional(); // "YYYY-MM-DD" o "T0+3mesi"
const deliverableSchema = z.object({
  type: z.enum(DELIVERABLE_TYPES),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  dueDate: dateOrRelativeSchema,
});
const phaseImportSchema = z.object({
  name: z.string().min(1).max(200),
  startDate: dateOrRelativeSchema,
  endDate: dateOrRelativeSchema,
  deliverables: z.array(deliverableSchema).optional().default([]),
});
const workPackageImportSchema = z.object({
  name: z.string().min(1).max(200),
  phaseName: z.string().min(1).max(200),
  startDate: dateOrRelativeSchema,
  endDate: dateOrRelativeSchema,
  deliverables: z.array(deliverableSchema).optional().default([]),
});
const importBodySchema = z.object({
  projectName: z.string().max(200).optional(),
  t0: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // Data di inizio progetto (T0)
  projectStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // alias
  phases: z.array(phaseImportSchema).min(1),
  workPackages: z.array(workPackageImportSchema).optional().default([]),
});

export type ImportProjectJson = z.infer<typeof importBodySchema>;

export async function importFromJson(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId } = req.params;
    const file = req.file as Express.Multer.File | undefined;
    if (!file || !file.buffer) {
      next(new AppError(400, "Carica un file JSON", "VALIDATION_ERROR"));
      return;
    }
    let body: unknown;
    try {
      body = JSON.parse(file.buffer.toString("utf-8"));
    } catch {
      next(new AppError(400, "File JSON non valido", "VALIDATION_ERROR"));
      return;
    }
    const data = importBodySchema.parse(body);

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      next(new AppError(404, "Progetto non trovato", "NOT_FOUND"));
      return;
    }

    const t0Str = data.t0 ?? data.projectStartDate;
    const t0Date = t0Str ? new Date(t0Str) : null;

    await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(data.projectName?.trim() && { name: data.projectName.trim() }),
        ...(t0Date && { t0Date }),
      },
    });

    const phaseIdByName: Record<string, string> = {};
    let sortOrder = 0;
    for (const p of data.phases) {
      const startParsed = parseDateOrRelative(p.startDate, t0Date);
      const endParsed = parseDateOrRelative(p.endDate, t0Date);
      const existing = await prisma.projectPhase.findFirst({
        where: { projectId, name: p.name },
      });
      const phaseData = {
        sortOrder,
        startDate: startParsed.date,
        endDate: endParsed.date,
        startDateRelative: startParsed.relative,
        endDateRelative: endParsed.relative,
      };
      if (existing) {
        await prisma.projectPhase.update({
          where: { id: existing.id },
          data: phaseData,
        });
        phaseIdByName[p.name] = existing.id;
      } else {
        const created = await prisma.projectPhase.create({
          data: {
            projectId,
            name: p.name,
            ...phaseData,
          },
        });
        phaseIdByName[p.name] = created.id;
      }
      sortOrder++;
    }

    const wpIdByName: Record<string, string> = {};
    sortOrder = 0;
    for (const wp of data.workPackages) {
      const phaseId = phaseIdByName[wp.phaseName] ?? null;
      const wpStartParsed = parseDateOrRelative(wp.startDate, t0Date);
      const wpEndParsed = parseDateOrRelative(wp.endDate, t0Date);
      const existing = await prisma.workPackage.findFirst({
        where: { projectId, name: wp.name },
      });
      const wpData = {
        phaseId,
        sortOrder,
        startDate: wpStartParsed.date,
        endDate: wpEndParsed.date,
        startDateRelative: wpStartParsed.relative,
        endDateRelative: wpEndParsed.relative,
      };
      if (existing) {
        await prisma.workPackage.update({
          where: { id: existing.id },
          data: wpData,
        });
        wpIdByName[wp.name] = existing.id;
      } else {
        const created = await prisma.workPackage.create({
          data: { projectId, name: wp.name, ...wpData },
        });
        wpIdByName[wp.name] = created.id;
      }
      sortOrder++;
    }

    let deliverableCount = 0;
    for (const p of data.phases) {
      const phaseId = phaseIdByName[p.name];
      if (!phaseId || !p.deliverables?.length) continue;
      for (let i = 0; i < p.deliverables.length; i++) {
        const d = p.deliverables[i];
        const dueParsed = parseDateOrRelative(d.dueDate, t0Date);
        await prisma.projectDeliverable.create({
          data: {
            projectId,
            phaseId,
            type: d.type,
            title: d.title,
            description: d.description ?? null,
            dueDate: dueParsed.date,
            dueDateRelative: dueParsed.relative,
            sortOrder: i,
          },
        });
        deliverableCount++;
      }
    }
    for (const wp of data.workPackages) {
      const workPackageId = wpIdByName[wp.name];
      if (!workPackageId || !wp.deliverables?.length) continue;
      for (let i = 0; i < wp.deliverables.length; i++) {
        const d = wp.deliverables[i];
        const dueParsed = parseDateOrRelative(d.dueDate, t0Date);
        await prisma.projectDeliverable.create({
          data: {
            projectId,
            workPackageId,
            type: d.type,
            title: d.title,
            description: d.description ?? null,
            dueDate: dueParsed.date,
            dueDateRelative: dueParsed.relative,
            sortOrder: i,
          },
        });
        deliverableCount++;
      }
    }

    res.status(201).json({
      ok: true,
      message: "Import completato",
      created: {
        phases: data.phases.length,
        workPackages: data.workPackages.length,
        deliverables: deliverableCount,
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      next(new AppError(400, "JSON non valido: " + e.errors.map((x) => x.message).join(", "), "VALIDATION_ERROR"));
      return;
    }
    next(e);
  }
}

/**
 * Ricalcola le date assolute di fasi, WP e deliverable a partire dal nuovo T0
 * (per tutti gli elementi che hanno *Relative impostato).
 */
export async function recomputeDatesFromT0(projectId: string, t0: Date): Promise<void> {
  const phases = await prisma.projectPhase.findMany({
    where: { projectId },
    select: { id: true, startDateRelative: true, endDateRelative: true },
  });
  for (const p of phases) {
    const startDate = p.startDateRelative ? parseRelativeDate(p.startDateRelative, t0) : null;
    const endDate = p.endDateRelative ? parseRelativeDate(p.endDateRelative, t0) : null;
    await prisma.projectPhase.update({
      where: { id: p.id },
      data: { startDate, endDate },
    });
  }
  const wps = await prisma.workPackage.findMany({
    where: { projectId },
    select: { id: true, startDateRelative: true, endDateRelative: true },
  });
  for (const wp of wps) {
    const startDate = wp.startDateRelative ? parseRelativeDate(wp.startDateRelative, t0) : null;
    const endDate = wp.endDateRelative ? parseRelativeDate(wp.endDateRelative, t0) : null;
    await prisma.workPackage.update({
      where: { id: wp.id },
      data: { startDate, endDate },
    });
  }
  const deliverables = await prisma.projectDeliverable.findMany({
    where: { projectId },
    select: { id: true, dueDateRelative: true },
  });
  for (const d of deliverables) {
    const dueDate = d.dueDateRelative ? parseRelativeDate(d.dueDateRelative, t0) : null;
    await prisma.projectDeliverable.update({
      where: { id: d.id },
      data: { dueDate },
    });
  }
}

/** Aggiorna la data T0 del progetto e ricalcola tutte le date relative. */
export async function updateProjectT0(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId } = req.params;
    const body = z.object({ t0Date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(req.body);
    const t0 = new Date(body.t0Date);
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      next(new AppError(404, "Progetto non trovato", "NOT_FOUND"));
      return;
    }
    await prisma.project.update({
      where: { id: projectId },
      data: { t0Date: t0 },
    });
    await recomputeDatesFromT0(projectId, t0);
    res.json({ ok: true, t0Date: body.t0Date, message: "Data T0 aggiornata; tutte le date relative sono state ricalcolate." });
  } catch (e) {
    if (e instanceof z.ZodError) {
      next(new AppError(400, "t0Date richiesta in formato YYYY-MM-DD", "VALIDATION_ERROR"));
      return;
    }
    next(e);
  }
}

/** Elimina tutte le fasi, work package e deliverable del progetto (struttura importata da JSON). */
export async function resetSummaryStructure(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId } = req.params;
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      next(new AppError(404, "Progetto non trovato", "NOT_FOUND"));
      return;
    }
    await prisma.$transaction([
      prisma.projectDeliverable.deleteMany({ where: { projectId } }),
      prisma.workPackage.deleteMany({ where: { projectId } }),
      prisma.projectPhase.deleteMany({ where: { projectId } }),
    ]);
    res.json({ ok: true, message: "Fasi, work package e deliverable sono stati eliminati." });
  } catch (e) {
    next(e);
  }
}

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
            workPackages: { orderBy: { sortOrder: "asc" }, include: { _count: { select: { tasks: true } }, deliverables: { orderBy: { sortOrder: "asc" } } } },
            _count: { select: { tasks: true } },
            deliverables: { orderBy: { sortOrder: "asc" } },
          },
        },
        workPackages: {
          orderBy: { sortOrder: "asc" },
          include: { phase: true, _count: { select: { tasks: true } }, deliverables: { orderBy: { sortOrder: "asc" } } },
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
    const inThreeMonths = new Date(now);
    inThreeMonths.setMonth(inThreeMonths.getMonth() + 3);
    const isWithin3Months = (d: Date) => {
      const d0 = new Date(d);
      d0.setHours(0, 0, 0, 0);
      return d0 >= now && d0 <= inThreeMonths;
    };
    const deliverableTaskIds = await prisma.projectDeliverable
      .findMany({ where: { projectId, taskId: { not: null } }, select: { taskId: true } })
      .then((rows) => new Set(rows.map((r) => r.taskId).filter(Boolean) as string[]));

    const isCompletedColumn = (name: string) => name?.toLowerCase() === "completato";
    const overdue = tasks.filter(
      (t) => t.dueDate && isOverdue(new Date(t.dueDate)) && !isCompletedColumn(t.column.name)
    );
    const upcoming = tasks
      .filter((t) => t.dueDate && isWithin3Months(new Date(t.dueDate)))
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 20);
    const completed = tasks.filter(
      (t) => isCompletedColumn(t.column.name) && deliverableTaskIds.has(t.id)
    );

    let futureEvents: { id: string; date: Date; time: string | null; type: string; name: string; notes: string | null }[] = [];
    try {
      futureEvents = await prisma.projectEvent.findMany({
        where: { projectId, date: { gte: now } },
        orderBy: [{ date: "asc" }, { time: "asc" }],
        take: 30,
      });
    } catch {
      // tabella eventi assente o errore: restituisci array vuoto
    }

    const analytics = {
      totalTasks: tasks.length,
      byColumn: project.columns.map((c) => ({
        id: c.id,
        name: c.name,
        count: c._count.tasks,
      })),
      overdueCount: overdue.length,
      upcomingCount: tasks.filter((t) => t.dueDate && isWithin3Months(new Date(t.dueDate))).length,
      completedCount: completed.length,
      totalDiaryEntries: await prisma.diaryEntry.count({ where: { projectId } }),
    };

    res.json({
      project: {
        id: project.id,
        name: project.name,
        t0Date: project.t0Date,
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
      completed: completed.map((t) => ({
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
      futureEvents: futureEvents.map((e) => ({
        id: e.id,
        date: e.date,
        time: e.time,
        type: e.type,
        name: e.name,
        notes: e.notes,
      })),
      phases: project.phases.map((p) => ({
        id: p.id,
        name: p.name,
        sortOrder: p.sortOrder,
        startDate: p.startDate,
        endDate: p.endDate,
        startDateRelative: "startDateRelative" in p ? p.startDateRelative : null,
        endDateRelative: "endDateRelative" in p ? p.endDateRelative : null,
        taskCount: p._count.tasks,
        deliverables: "deliverables" in p ? p.deliverables : [],
        workPackages: p.workPackages.map((wp) => ({
          id: wp.id,
          name: wp.name,
          sortOrder: wp.sortOrder,
          taskCount: wp._count.tasks,
          deliverables: "deliverables" in wp ? wp.deliverables : [],
        })),
      })),
      workPackages: project.workPackages.map((wp) => ({
        id: wp.id,
        name: wp.name,
        sortOrder: wp.sortOrder,
        phaseId: wp.phaseId,
        phase: wp.phase,
        taskCount: wp._count.tasks,
        deliverables: "deliverables" in wp ? wp.deliverables : [],
      })),
    });
  } catch (e) {
    next(e);
  }
}
