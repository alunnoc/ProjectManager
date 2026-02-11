import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  phaseId: z.string().optional(),
});
const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  phaseId: z.string().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});
const reorderSchema = z.object({ workPackageIds: z.array(z.string()) });

export async function listWorkPackages(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId } = req.params;
    const workPackages = await prisma.workPackage.findMany({
      where: { projectId },
      orderBy: { sortOrder: "asc" },
      include: {
        phase: true,
        _count: { select: { tasks: true } },
      },
    });
    res.json(workPackages);
  } catch (e) {
    next(e);
  }
}

export async function createWorkPackage(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId } = req.params;
    const body = createSchema.parse(req.body);
    if (body.phaseId) {
      const phase = await prisma.projectPhase.findFirst({
        where: { id: body.phaseId, projectId },
      });
      if (!phase) {
        next(new AppError(400, "Fase non trovata", "NOT_FOUND"));
        return;
      }
    }
    const maxOrder = await prisma.workPackage.aggregate({
      where: { projectId },
      _max: { sortOrder: true },
    });
    const order = (maxOrder._max.sortOrder ?? -1) + 1;
    const wp = await prisma.workPackage.create({
      data: {
        projectId,
        name: body.name,
        phaseId: body.phaseId ?? null,
        sortOrder: order,
      },
      include: { phase: true },
    });
    res.status(201).json(wp);
  } catch (e) {
    if (e instanceof z.ZodError) {
      next(new AppError(400, e.errors.map((x) => x.message).join(", "), "VALIDATION_ERROR"));
      return;
    }
    next(e);
  }
}

export async function updateWorkPackage(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId, workPackageId } = req.params;
    const body = updateSchema.parse(req.body);
    const data: { name?: string; sortOrder?: number; phaseId?: string | null } = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
    if (body.phaseId !== undefined) {
      if (body.phaseId) {
        const phase = await prisma.projectPhase.findFirst({
          where: { id: body.phaseId, projectId },
        });
        if (!phase) {
          next(new AppError(400, "Fase non trovata", "NOT_FOUND"));
          return;
        }
        data.phaseId = body.phaseId;
      } else {
        data.phaseId = null;
      }
    }
    const wp = await prisma.workPackage.updateMany({
      where: { id: workPackageId, projectId },
      data,
    });
    if (wp.count === 0) {
      next(new AppError(404, "Work package non trovato", "NOT_FOUND"));
      return;
    }
    const updated = await prisma.workPackage.findUnique({
      where: { id: workPackageId },
      include: { phase: true },
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

export async function deleteWorkPackage(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId, workPackageId } = req.params;
    const result = await prisma.workPackage.deleteMany({
      where: { id: workPackageId, projectId },
    });
    if (result.count === 0) {
      next(new AppError(404, "Work package non trovato", "NOT_FOUND"));
      return;
    }
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

export async function reorderWorkPackages(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId } = req.params;
    const { workPackageIds } = reorderSchema.parse(req.body);
    await prisma.$transaction(
      workPackageIds.map((id, index) =>
        prisma.workPackage.updateMany({
          where: { id, projectId },
          data: { sortOrder: index },
        })
      )
    );
    const workPackages = await prisma.workPackage.findMany({
      where: { projectId },
      orderBy: { sortOrder: "asc" },
      include: { phase: true },
    });
    res.json(workPackages);
  } catch (e) {
    if (e instanceof z.ZodError) {
      next(new AppError(400, e.errors.map((x) => x.message).join(", "), "VALIDATION_ERROR"));
      return;
    }
    next(e);
  }
}
