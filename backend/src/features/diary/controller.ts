import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import path from "node:path";
import fs from "node:fs/promises";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  content: z.string().max(50000).optional(),
});
const updateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  content: z.string().max(50000).optional(),
});
const commentSchema = z.object({ content: z.string().min(1).max(2000) });

export async function listEntries(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId } = req.params;
    const entries = await prisma.diaryEntry.findMany({
      where: { projectId },
      orderBy: { date: "desc" },
      include: { images: true, comments: true },
    });
    res.json(entries);
  } catch (e) {
    next(e);
  }
}

/** Restituisce le date (YYYY-MM-DD) che hanno almeno un resoconto nel progetto (per evidenziare il calendario). */
export async function calendarDaysWithEntries(req: Request, res: Response, next: NextFunction) {
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
    const entries = await prisma.diaryEntry.findMany({
      where: { projectId, date: { gte: start, lte: end } },
      select: { date: true },
      distinct: ["date"],
    });
    const dates = entries.map((e) => e.date.toISOString().slice(0, 10));
    res.json({ dates });
  } catch (e) {
    next(e);
  }
}

export async function getEntriesByDate(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId } = req.params;
    const dateStr = req.query.date as string;
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      next(new AppError(400, "Parametro date richiesto (YYYY-MM-DD)", "VALIDATION_ERROR"));
      return;
    }
    const date = new Date(dateStr);
    const entries = await prisma.diaryEntry.findMany({
      where: { projectId, date },
      orderBy: { createdAt: "asc" },
      include: { images: true, comments: true },
    });
    res.json(entries);
  } catch (e) {
    next(e);
  }
}

export async function createEntry(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId } = req.params;
    const body = createSchema.parse(req.body);
    const date = new Date(body.date);
    const entry = await prisma.diaryEntry.create({
      data: { projectId, date, content: body.content ?? null },
      include: { images: true, comments: true },
    });
    res.status(201).json(entry);
  } catch (e) {
    if (e instanceof z.ZodError) {
      next(new AppError(400, e.errors.map((x) => x.message).join(", "), "VALIDATION_ERROR"));
      return;
    }
    next(e);
  }
}

export async function getEntry(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId, entryId } = req.params;
    const entry = await prisma.diaryEntry.findFirst({
      where: { id: entryId, projectId },
      include: { images: true, comments: true },
    });
    if (!entry) {
      next(new AppError(404, "Resoconto non trovato", "NOT_FOUND"));
      return;
    }
    res.json(entry);
  } catch (e) {
    next(e);
  }
}

export async function updateEntry(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId, entryId } = req.params;
    const body = updateSchema.parse(req.body);
    const data: { date?: Date; content?: string | null } = {};
    if (body.date) data.date = new Date(body.date);
    if (body.content !== undefined) data.content = body.content;
    const entry = await prisma.diaryEntry.updateMany({
      where: { id: entryId, projectId },
      data,
    });
    if (entry.count === 0) {
      next(new AppError(404, "Resoconto non trovato", "NOT_FOUND"));
      return;
    }
    const updated = await prisma.diaryEntry.findUnique({
      where: { id: entryId },
      include: { images: true, comments: true },
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

export async function deleteEntry(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId, entryId } = req.params;
    const entry = await prisma.diaryEntry.findFirst({
      where: { id: entryId, projectId },
      include: { images: true },
    });
    if (!entry) {
      next(new AppError(404, "Resoconto non trovato", "NOT_FOUND"));
      return;
    }
    for (const img of entry.images) {
      try {
        await fs.unlink(path.join(process.cwd(), img.path));
      } catch (_) {}
    }
    await prisma.diaryEntry.delete({ where: { id: entryId } });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

export async function addImage(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId, entryId } = req.params;
    const file = req.file;
    if (!file) {
      next(new AppError(400, "Nessun file caricato", "VALIDATION_ERROR"));
      return;
    }
    const entry = await prisma.diaryEntry.findFirst({ where: { id: entryId, projectId } });
    if (!entry) {
      next(new AppError(404, "Resoconto non trovato", "NOT_FOUND"));
      return;
    }
    const relativePath = `${process.env.UPLOADS_DIR ?? "uploads"}/${file.filename}`;
    const image = await prisma.diaryImage.create({
      data: { diaryEntryId: entryId, filename: file.originalname, path: relativePath },
    });
    res.status(201).json(image);
  } catch (e) {
    next(e);
  }
}

export async function removeImage(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId, entryId, imageId } = req.params;
    const image = await prisma.diaryImage.findFirst({
      where: {
        id: imageId,
        diaryEntry: { id: entryId, projectId },
      },
    });
    if (!image) {
      next(new AppError(404, "Immagine non trovata", "NOT_FOUND"));
      return;
    }
    try {
      await fs.unlink(path.join(process.cwd(), image.path));
    } catch (_) {}
    await prisma.diaryImage.delete({ where: { id: imageId } });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

export async function addComment(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId, entryId } = req.params;
    const body = commentSchema.parse(req.body);
    const entry = await prisma.diaryEntry.findFirst({ where: { id: entryId, projectId } });
    if (!entry) {
      next(new AppError(404, "Resoconto non trovato", "NOT_FOUND"));
      return;
    }
    const comment = await prisma.diaryComment.create({
      data: { diaryEntryId: entryId, content: body.content },
    });
    res.status(201).json(comment);
  } catch (e) {
    if (e instanceof z.ZodError) {
      next(new AppError(400, e.errors.map((x) => x.message).join(", "), "VALIDATION_ERROR"));
      return;
    }
    next(e);
  }
}
