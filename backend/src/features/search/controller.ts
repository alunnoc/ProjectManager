import { Request, Response, NextFunction } from "express";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";

/**
 * Ricerca full-text su:
 * - Titoli e descrizioni task
 * - Commenti task
 * - Contenuto e commenti resoconti diario
 * - Nome file immagini (task e diario)
 * Utilizza PostgreSQL plainto_tsquery per termini multipli.
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

    res.json({
      tasks,
      diary: diaryEntries,
    });
  } catch (e) {
    next(e);
  }
}
