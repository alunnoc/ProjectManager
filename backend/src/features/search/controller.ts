import { Request, Response, NextFunction } from "express";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";

/**
 * Ricerca full-text su:
 * - Titoli e descrizioni task
 * - Commenti task
 * - Contenuto e commenti resoconti diario
 * - Nome file immagini (task e diario)
 * - Eventi (call/meeting): nome, note, minuta
 */
export async function fullTextSearch(req: Request, res: Response, next: NextFunction) {
  try {
    const q = (req.query.q as string)?.trim();
    const projectId = (req.query.projectId as string) | undefined;

    if (!q || q.length < 2) {
      next(new AppError(400, "La ricerca richiede almeno 2 caratteri", "VALIDATION_ERROR"));
      return;
    }

    const baseWhere = projectId ? { projectId } : {};

    // Task: titolo, descrizione, commenti
    const tasks = await prisma.task.findMany({
      where: {
        ...baseWhere,
        OR: [
          {
            title: { contains: q, mode: "insensitive" },
          },
          {
            description: { contains: q, mode: "insensitive" },
          },
          {
            comments: {
              some: { content: { contains: q, mode: "insensitive" } },
            },
          },
          {
            attachments: {
              some: { filename: { contains: q, mode: "insensitive" } },
            },
          },
        ],
      },
      include: {
        project: { select: { id: true, name: true } },
        column: { select: { id: true, name: true } },
        comments: true,
        attachments: true,
      },
      take: 50,
    });

    // Diary: content, commenti, nome file immagini
    const diaryEntries = await prisma.diaryEntry.findMany({
      where: {
        ...baseWhere,
        OR: [
          { content: { contains: q, mode: "insensitive" } },
          {
            comments: {
              some: { content: { contains: q, mode: "insensitive" } },
            },
          },
          {
            images: {
              some: { filename: { contains: q, mode: "insensitive" } },
            },
          },
        ],
      },
      include: {
        project: { select: { id: true, name: true } },
        images: true,
        comments: true,
      },
      take: 50,
    });

    // Eventi (call/meeting): nome, note, minuta
    const pattern = `%${q.replace(/'/g, "''")}%`;
    const eventRows = projectId
      ? await prisma.$queryRawUnsafe<
          Array<Record<string, unknown> & { projectId: string; projectName?: string }>
        >(
          `SELECT e.id, e."projectId", e.date, e.time, e.type, e.name, e.notes, e."meetingMinutes", e."createdAt",
                  p.name as "projectName"
           FROM "ProjectEvent" e
           JOIN "Project" p ON p.id = e."projectId"
           WHERE e."projectId" = $1 AND (e.name ILIKE $2 OR e.notes ILIKE $2 OR e."meetingMinutes" ILIKE $2)
           ORDER BY e.date DESC, e.time ASC NULLS LAST
           LIMIT 50`,
          projectId,
          pattern
        )
      : await prisma.$queryRawUnsafe<
          Array<Record<string, unknown> & { projectId: string; projectName?: string }>
        >(
          `SELECT e.id, e."projectId", e.date, e.time, e.type, e.name, e.notes, e."meetingMinutes", e."createdAt",
                  p.name as "projectName"
           FROM "ProjectEvent" e
           JOIN "Project" p ON p.id = e."projectId"
           WHERE e.name ILIKE $1 OR e.notes ILIKE $1 OR e."meetingMinutes" ILIKE $1
           ORDER BY e.date DESC, e.time ASC NULLS LAST
           LIMIT 50`,
          pattern
        );

    const events = eventRows.map((r) => ({
      id: r.id,
      projectId: r.projectId,
      date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date).slice(0, 10),
      time: r.time ?? null,
      type: r.type,
      name: r.name,
      notes: r.notes ?? null,
      meetingMinutes: r.meetingMinutes ?? null,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      project: { id: r.projectId, name: r.projectName ?? "" },
    }));

    res.json({
      tasks,
      diary: diaryEntries,
      events,
    });
  } catch (e) {
    next(e);
  }
}
