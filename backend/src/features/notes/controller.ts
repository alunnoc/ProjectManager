import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";

const createSchema = z.object({
  title: z.string().min(1).max(120),
  content: z.string().max(50000).optional(),
});
const updateSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  content: z.string().max(50000).nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export async function listNotes(req: Request, res: Response, next: NextFunction) {
  try {
    const projectId = req.params.projectId as string;
    const notes = await prisma.projectNote.findMany({
      where: { projectId },
      orderBy: { sortOrder: "asc" },
    });
    res.json(notes);
  } catch (e) {
    next(e);
  }
}

export async function createNote(req: Request, res: Response, next: NextFunction) {
  try {
    const projectId = req.params.projectId as string;
    const body = createSchema.parse(req.body);
    const maxOrder = await prisma.projectNote.aggregate({
      where: { projectId },
      _max: { sortOrder: true },
    });
    const sortOrder = (maxOrder._max?.sortOrder ?? -1) + 1;
    const note = await prisma.projectNote.create({
      data: {
        projectId,
        title: body.title.trim(),
        content: body.content?.trim() || null,
        sortOrder,
      },
    });
    res.status(201).json(note);
  } catch (e) {
    if (e instanceof z.ZodError) {
      next(new AppError(400, e.errors.map((x) => x.message).join(", "), "VALIDATION_ERROR"));
      return;
    }
    next(e);
  }
}

export async function updateNote(req: Request, res: Response, next: NextFunction) {
  try {
    const projectId = req.params.projectId as string;
    const noteId = req.params.noteId as string;
    const body = updateSchema.parse(req.body);
    const existing = await prisma.projectNote.findFirst({
      where: { id: noteId, projectId },
    });
    if (!existing) {
      next(new AppError(404, "Appunto non trovato", "NOT_FOUND"));
      return;
    }
    const data: { title?: string; content?: string | null; sortOrder?: number } = {};
    if (body.title !== undefined) data.title = body.title.trim();
    if (body.content !== undefined) data.content = body.content?.trim() || null;
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
    const note = await prisma.projectNote.update({
      where: { id: noteId },
      data,
    });
    res.json(note);
  } catch (e) {
    if (e instanceof z.ZodError) {
      next(new AppError(400, e.errors.map((x) => x.message).join(", "), "VALIDATION_ERROR"));
      return;
    }
    next(e);
  }
}

export async function deleteNote(req: Request, res: Response, next: NextFunction) {
  try {
    const projectId = req.params.projectId as string;
    const noteId = req.params.noteId as string;
    const result = await prisma.projectNote.deleteMany({
      where: { id: noteId, projectId },
    });
    if (result.count === 0) {
      next(new AppError(404, "Appunto non trovato", "NOT_FOUND"));
      return;
    }
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}
