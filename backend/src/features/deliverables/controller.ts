import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";

const TYPES = ["document", "block_diagram", "prototype", "report", "other"] as const;

const createSchema = z.object({
  phaseId: z.string().optional(),
  workPackageId: z.string().optional(),
  type: z.enum(TYPES),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dueDateRelative: z.string().max(50).optional(),
}).refine((d) => d.phaseId || d.workPackageId, { message: "Indica phaseId o workPackageId" });

const updateSchema = z.object({
  type: z.enum(TYPES).optional(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).nullable().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  dueDateRelative: z.string().max(50).nullable().optional(),
});

export async function createDeliverable(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId } = req.params;
    const body = createSchema.parse(req.body);
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      next(new AppError(404, "Progetto non trovato", "NOT_FOUND"));
      return;
    }
    if (body.phaseId) {
      const phase = await prisma.projectPhase.findFirst({ where: { id: body.phaseId, projectId } });
      if (!phase) {
        next(new AppError(400, "Fase non trovata", "NOT_FOUND"));
        return;
      }
    }
    if (body.workPackageId) {
      const wp = await prisma.workPackage.findFirst({ where: { id: body.workPackageId, projectId } });
      if (!wp) {
        next(new AppError(400, "Work package non trovato", "NOT_FOUND"));
        return;
      }
    }
    const maxOrder = await prisma.projectDeliverable.aggregate({
      where: body.workPackageId
        ? { workPackageId: body.workPackageId }
        : { phaseId: body.phaseId },
      _max: { sortOrder: true },
    });
    const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;
    const deliverable = await prisma.projectDeliverable.create({
      data: {
        projectId,
        phaseId: body.phaseId ?? null,
        workPackageId: body.workPackageId ?? null,
        type: body.type,
        title: body.title,
        description: body.description ?? null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        dueDateRelative: body.dueDateRelative ?? null,
        sortOrder,
      },
    });
    res.status(201).json(deliverable);
  } catch (e) {
    if (e instanceof z.ZodError) {
      next(new AppError(400, e.errors.map((x) => x.message).join(", "), "VALIDATION_ERROR"));
      return;
    }
    next(e);
  }
}

export async function updateDeliverable(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId, deliverableId } = req.params;
    const body = updateSchema.parse(req.body);
    const existing = await prisma.projectDeliverable.findFirst({
      where: { id: deliverableId, projectId },
    });
    if (!existing) {
      next(new AppError(404, "Deliverable non trovato", "NOT_FOUND"));
      return;
    }
    const data: { type?: string; title?: string; description?: string | null; dueDate?: Date | null; dueDateRelative?: string | null } = {};
    if (body.type !== undefined) data.type = body.type;
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.dueDateRelative !== undefined) data.dueDateRelative = body.dueDateRelative;
    const updated = await prisma.projectDeliverable.update({
      where: { id: deliverableId },
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

export async function deleteDeliverable(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId, deliverableId } = req.params;
    const result = await prisma.projectDeliverable.deleteMany({
      where: { id: deliverableId, projectId },
    });
    if (result.count === 0) {
      next(new AppError(404, "Deliverable non trovato", "NOT_FOUND"));
      return;
    }
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

/** Crea un task dalla board nella colonna "Da fare" (order 0) a partire dal deliverable */
export async function convertDeliverableToTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId, deliverableId } = req.params;
    const deliverable = await prisma.projectDeliverable.findFirst({
      where: { id: deliverableId, projectId },
    });
    if (!deliverable) {
      next(new AppError(404, "Deliverable non trovato", "NOT_FOUND"));
      return;
    }
    const firstColumn = await prisma.boardColumn.findFirst({
      where: { projectId },
      orderBy: { order: "asc" },
    });
    if (!firstColumn) {
      next(new AppError(400, "Nessuna colonna sulla board. Aggiungi almeno una colonna (es. Da fare).", "VALIDATION_ERROR"));
      return;
    }
    const maxOrder = await prisma.task.aggregate({
      where: { columnId: firstColumn.id },
      _max: { order: true },
    });
    const order = (maxOrder._max.order ?? -1) + 1;
    const task = await prisma.task.create({
      data: {
        projectId,
        columnId: firstColumn.id,
        title: deliverable.title,
        description: deliverable.description ?? null,
        order,
        dueDate: deliverable.dueDate,
        phaseId: deliverable.phaseId,
        workPackageId: deliverable.workPackageId,
      },
      include: { comments: true, attachments: true, phase: true, workPackage: true },
    });
    res.status(201).json(task);
  } catch (e) {
    next(e);
  }
}
