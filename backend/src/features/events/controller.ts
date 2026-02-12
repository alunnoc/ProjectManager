import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";

const TYPES = ["call", "meeting", "other"] as const;
const timeRegex = /^([01]?\d|2[0-3]):[0-5]\d$/;

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(timeRegex).optional(),
  type: z.enum(TYPES),
  name: z.string().min(1).max(300),
  notes: z.string().max(2000).optional(),
});
const updateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time: z.string().regex(timeRegex).nullable().optional(),
  type: z.enum(TYPES).optional(),
  name: z.string().min(1).max(300).optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function listEvents(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId } = req.params;
    const events = await prisma.projectEvent.findMany({
      where: { projectId },
      orderBy: [{ date: "asc" }, { time: "asc" }],
    });
    res.json(events);
  } catch (e) {
    next(e);
  }
}

/** Date (YYYY-MM-DD) con almeno un evento nel mese (per calendario) */
export async function calendarDaysWithEvents(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId } = req.params;
    const year = req.query.year as string;
    const month = req.query.month as string;
    if (!year || !month) {
      next(new AppError(400, "Parametri year e month richiesti", "VALIDATION_ERROR"));
      return;
    }
    const start = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    const end = new Date(parseInt(year, 10), parseInt(month, 10), 0);
    const events = await prisma.projectEvent.findMany({
      where: { projectId, date: { gte: start, lte: end } },
      select: { date: true },
      distinct: ["date"],
    });
    const dates = events.map((e) => e.date.toISOString().slice(0, 10));
    res.json({ dates });
  } catch (e) {
    next(e);
  }
}

/** Eventi da oggi in poi (per homepage / anteprima) */
export async function getFutureEvents(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId } = req.params;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const events = await prisma.projectEvent.findMany({
      where: { projectId, date: { gte: now } },
      orderBy: [{ date: "asc" }, { time: "asc" }],
      take: 15,
    });
    res.json(events);
  } catch (e) {
    next(e);
  }
}

export async function getEventsByDate(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId } = req.params;
    const dateStr = req.query.date as string;
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      next(new AppError(400, "Parametro date richiesto (YYYY-MM-DD)", "VALIDATION_ERROR"));
      return;
    }
    const date = new Date(dateStr);
    const events = await prisma.projectEvent.findMany({
      where: { projectId, date },
      orderBy: { time: "asc" },
    });
    res.json(events);
  } catch (e) {
    next(e);
  }
}

export async function createEvent(req: Request, res: Response, next: NextFunction) {
  try {
    if (typeof (prisma as { projectEvent?: unknown }).projectEvent === "undefined") {
      next(
        new AppError(
          500,
          "Modello eventi non disponibile. Nella cartella backend esegui: npx prisma generate e riavvia il server.",
          "PRISMA_CLIENT_OUTDATED"
        )
      );
      return;
    }
    const { projectId } = req.params;
    const body = createSchema.parse(req.body);
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      next(new AppError(404, "Progetto non trovato", "NOT_FOUND"));
      return;
    }
    const event = await prisma.projectEvent.create({
      data: {
        projectId,
        date: new Date(body.date),
        time: body.time ?? null,
        type: body.type,
        name: body.name,
        notes: body.notes ?? null,
      },
    });
    res.status(201).json(event);
  } catch (e) {
    if (e instanceof z.ZodError) {
      next(new AppError(400, e.errors.map((x) => x.message).join(", "), "VALIDATION_ERROR"));
      return;
    }
    next(e);
  }
}

export async function updateEvent(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId, eventId } = req.params;
    const body = updateSchema.parse(req.body);
    const existing = await prisma.projectEvent.findFirst({
      where: { id: eventId, projectId },
    });
    if (!existing) {
      next(new AppError(404, "Evento non trovato", "NOT_FOUND"));
      return;
    }
    const data: { date?: Date; time?: string | null; type?: string; name?: string; notes?: string | null } = {};
    if (body.date !== undefined) data.date = new Date(body.date);
    if (body.time !== undefined) data.time = body.time;
    if (body.type !== undefined) data.type = body.type;
    if (body.name !== undefined) data.name = body.name;
    if (body.notes !== undefined) data.notes = body.notes;
    const updated = await prisma.projectEvent.update({
      where: { id: eventId },
      data,
    });
    res.json(updated);
  } catch (e) {
    if (e instanceof z.ZodError) {
      next(new AppError(400, e.errors.map((x) => x.message).join(", "), "VALIDATION_ERROR"));
      return;
    }
    next(e);
  }
}

export async function deleteEvent(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId, eventId } = req.params;
    const result = await prisma.projectEvent.deleteMany({
      where: { id: eventId, projectId },
    });
    if (result.count === 0) {
      next(new AppError(404, "Evento non trovato", "NOT_FOUND"));
      return;
    }
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}
