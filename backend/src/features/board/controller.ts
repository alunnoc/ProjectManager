import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";

const createSchema = z.object({ name: z.string().min(1).max(100) });
const updateSchema = z.object({ name: z.string().min(1).max(100).optional() });
const reorderSchema = z.object({ columnIds: z.array(z.string()) });

export async function listColumns(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId } = req.params;
    const columns = await prisma.boardColumn.findMany({
      where: { projectId },
      orderBy: { order: "asc" },
      include: {
        tasks: {
          orderBy: { order: "asc" },
          include: { comments: true, attachments: true, phase: true, workPackage: true },
        },
      },
    });
    res.json(columns);
  } catch (e) {
    next(e);
  }
}

export async function createColumn(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId } = req.params;
    const body = createSchema.parse(req.body);
    const maxOrder = await prisma.boardColumn.aggregate({
      where: { projectId },
      _max: { order: true },
    });
    const order = (maxOrder._max.order ?? -1) + 1;
    const column = await prisma.boardColumn.create({
      data: { projectId, name: body.name, order },
    });
    res.status(201).json(column);
  } catch (e) {
    if (e instanceof z.ZodError) {
      next(new AppError(400, e.errors.map((x) => x.message).join(", "), "VALIDATION_ERROR"));
      return;
    }
    next(e);
  }
}

export async function updateColumn(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId, columnId } = req.params;
    const body = updateSchema.parse(req.body);
    const column = await prisma.boardColumn.updateMany({
      where: { id: columnId, projectId },
      data: body,
    });
    if (column.count === 0) {
      next(new AppError(404, "Colonna non trovata", "NOT_FOUND"));
      return;
    }
    const updated = await prisma.boardColumn.findUnique({ where: { id: columnId } });
    res.json(updated);
  } catch (e) {
    if (e instanceof z.ZodError) {
      next(new AppError(400, e.errors.map((x) => x.message).join(", "), "VALIDATION_ERROR"));
      return;
    }
    next(e);
  }
}

export async function deleteColumn(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId, columnId } = req.params;
    const result = await prisma.boardColumn.deleteMany({
      where: { id: columnId, projectId },
    });
    if (result.count === 0) {
      next(new AppError(404, "Colonna non trovata", "NOT_FOUND"));
      return;
    }
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

export async function reorderColumns(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId } = req.params;
    const { columnIds } = reorderSchema.parse(req.body);
    await prisma.$transaction(
      columnIds.map((id, index) =>
        prisma.boardColumn.updateMany({
          where: { id, projectId },
          data: { order: index },
        })
      )
    );
    const columns = await prisma.boardColumn.findMany({
      where: { projectId },
      orderBy: { order: "asc" },
    });
    res.json(columns);
  } catch (e) {
    if (e instanceof z.ZodError) {
      next(new AppError(400, e.errors.map((x) => x.message).join(", "), "VALIDATION_ERROR"));
      return;
    }
    next(e);
  }
}
