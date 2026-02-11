import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});
const reorderSchema = z.object({ phaseIds: z.array(z.string()) });

export async function listPhases(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId } = req.params;
    const phases = await prisma.projectPhase.findMany({
      where: { projectId },
      orderBy: { sortOrder: "asc" },
      include: {
        workPackages: { orderBy: { sortOrder: "asc" } },
        _count: { select: { tasks: true } },
      },
    });
    res.json(phases);
  } catch (e) {
    next(e);
  }
}

export async function createPhase(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId } = req.params;
    const body = createSchema.parse(req.body);
    const maxOrder = await prisma.projectPhase.aggregate({
      where: { projectId },
      _max: { sortOrder: true },
    });
    const order = (maxOrder._max.sortOrder ?? -1) + 1;
    const phase = await prisma.projectPhase.create({
      data: {
        projectId,
        name: body.name,
        sortOrder: order,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
      },
    });
    res.status(201).json(phase);
  } catch (e) {
    if (e instanceof z.ZodError) {
      next(new AppError(400, e.errors.map((x) => x.message).join(", "), "VALIDATION_ERROR"));
      return;
    }
    next(e);
  }
}

export async function updatePhase(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId, phaseId } = req.params;
    const body = updateSchema.parse(req.body);
    const data: { name?: string; sortOrder?: number; startDate?: Date | null; endDate?: Date | null } = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
    if (body.startDate !== undefined) data.startDate = body.startDate ? new Date(body.startDate) : null;
    if (body.endDate !== undefined) data.endDate = body.endDate ? new Date(body.endDate) : null;
    const phase = await prisma.projectPhase.updateMany({
      where: { id: phaseId, projectId },
      data,
    });
    if (phase.count === 0) {
      next(new AppError(404, "Fase non trovata", "NOT_FOUND"));
      return;
    }
    const updated = await prisma.projectPhase.findUnique({ where: { id: phaseId } });
    res.json(updated);
  } catch (e) {
    if (e instanceof z.ZodError) {
      next(new AppError(400, e.errors.map((x) => x.message).join(", "), "VALIDATION_ERROR"));
      return;
    }
    next(e);
  }
}

export async function deletePhase(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId, phaseId } = req.params;
    const result = await prisma.projectPhase.deleteMany({
      where: { id: phaseId, projectId },
    });
    if (result.count === 0) {
      next(new AppError(404, "Fase non trovata", "NOT_FOUND"));
      return;
    }
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

export async function reorderPhases(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId } = req.params;
    const { phaseIds } = reorderSchema.parse(req.body);
    await prisma.$transaction(
      phaseIds.map((id, index) =>
        prisma.projectPhase.updateMany({
          where: { id, projectId },
          data: { sortOrder: index },
        })
      )
    );
    const phases = await prisma.projectPhase.findMany({
      where: { projectId },
      orderBy: { sortOrder: "asc" },
    });
    res.json(phases);
  } catch (e) {
    if (e instanceof z.ZodError) {
      next(new AppError(400, e.errors.map((x) => x.message).join(", "), "VALIDATION_ERROR"));
      return;
    }
    next(e);
  }
}
