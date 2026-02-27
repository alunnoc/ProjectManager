import { Request, Response, NextFunction } from "express";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";

/** Date (YYYY-MM-DD) con resoconti e/o eventi in qualsiasi progetto (per calendario globale) */
export async function calendarDaysWithData(req: Request, res: Response, next: NextFunction) {
  try {
    const year = req.query.year as string;
    const month = req.query.month as string;
    if (!year || !month) {
      next(new AppError(400, "Parametri year e month richiesti", "VALIDATION_ERROR"));
      return;
    }
    const start = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    const end = new Date(parseInt(year, 10), parseInt(month, 10), 0);

    const [diaryDates, eventDates] = await Promise.all([
      prisma.diaryEntry.findMany({
        where: { date: { gte: start, lte: end } },
        select: { date: true },
        distinct: ["date"],
      }),
      prisma.projectEvent.findMany({
        where: { date: { gte: start, lte: end } },
        select: { date: true },
        distinct: ["date"],
      }),
    ]);

    const diaryDateSet = diaryDates.map((e) => e.date.toISOString().slice(0, 10));
    const eventDateSet = eventDates.map((e) => e.date.toISOString().slice(0, 10));
    const allDates = new Set([...diaryDateSet, ...eventDateSet]);

    res.json({
      diaryDates: [...new Set(diaryDateSet)].sort(),
      eventDates: [...new Set(eventDateSet)].sort(),
      dates: Array.from(allDates).sort(),
    });
  } catch (e) {
    next(e);
  }
}

/** Resoconti e eventi per una data da tutti i progetti (con info progetto) */
export async function getDataByDate(req: Request, res: Response, next: NextFunction) {
  try {
    const dateStr = req.query.date as string;
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      next(new AppError(400, "Parametro date richiesto (YYYY-MM-DD)", "VALIDATION_ERROR"));
      return;
    }
    const date = new Date(dateStr);

    const [diaryEntries, events] = await Promise.all([
      prisma.diaryEntry.findMany({
        where: { date },
        orderBy: { createdAt: "asc" },
        include: {
          project: { select: { id: true, name: true } },
          images: true,
          comments: true,
        },
      }),
      prisma.projectEvent.findMany({
        where: { date },
        orderBy: [{ time: "asc" }, { createdAt: "asc" }],
        include: {
          project: { select: { id: true, name: true } },
        },
      }),
    ]);

    const entriesWithProject = diaryEntries.map((e) => ({
      id: e.id,
      projectId: e.projectId,
      date: e.date.toISOString().slice(0, 10),
      content: e.content,
      createdAt: e.createdAt.toISOString(),
      images: e.images,
      comments: e.comments,
      project: e.project,
    }));

    const eventsWithProject = events.map((e) => ({
      id: e.id,
      projectId: e.projectId,
      date: e.date.toISOString().slice(0, 10),
      time: e.time,
      type: e.type,
      name: e.name,
      notes: e.notes,
      meetingMinutes: e.meetingMinutes,
      createdAt: e.createdAt.toISOString(),
      project: e.project,
    }));

    res.json({
      diaryEntries: entriesWithProject,
      events: eventsWithProject,
    });
  } catch (e) {
    next(e);
  }
}
