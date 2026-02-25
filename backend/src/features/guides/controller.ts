import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";

const createGuideSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  steps: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        content: z.string().max(10000).optional(),
        order: z.number().int().min(0).optional(),
      })
    )
    .optional(),
});

const updateGuideSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  sortOrder: z.number().int().optional(),
});

const updateStepSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().max(10000).nullable().optional(),
  order: z.number().int().min(0).optional(),
});

export async function listGuides(req: Request, res: Response, next: NextFunction) {
  try {
    const q = (req.query.q as string)?.trim();
    const where = q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } },
            { steps: { some: { title: { contains: q, mode: "insensitive" as const } } } },
            { steps: { some: { content: { contains: q, mode: "insensitive" as const } } } },
          ],
        }
      : undefined;

    const guides = await prisma.guide.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        steps: { orderBy: { order: "asc" } },
      },
    });
    res.json(guides);
  } catch (e) {
    next(e);
  }
}

export async function getGuide(req: Request, res: Response, next: NextFunction) {
  try {
    const { guideId } = req.params;
    const guide = await prisma.guide.findUnique({
      where: { id: guideId },
      include: {
        steps: { orderBy: { order: "asc" } },
      },
    });
    if (!guide) {
      next(new AppError(404, "Guida non trovata", "NOT_FOUND"));
      return;
    }
    res.json(guide);
  } catch (e) {
    next(e);
  }
}

export async function createGuide(req: Request, res: Response, next: NextFunction) {
  try {
    const body = createGuideSchema.parse(req.body);
    const maxOrder = await prisma.guide.aggregate({ _max: { sortOrder: true } });
    const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    const guide = await prisma.guide.create({
      data: {
        title: body.title,
        description: body.description ?? null,
        sortOrder,
        steps: body.steps?.length
          ? {
              create: body.steps.map((s, i) => ({
                title: s.title,
                content: s.content ?? null,
                order: s.order ?? i,
              })),
            }
          : undefined,
      },
      include: {
        steps: { orderBy: { order: "asc" } },
      },
    });
    res.status(201).json(guide);
  } catch (e) {
    if (e instanceof z.ZodError) {
      next(new AppError(400, e.errors.map((x) => x.message).join(", "), "VALIDATION_ERROR"));
      return;
    }
    next(e);
  }
}

export async function updateGuide(req: Request, res: Response, next: NextFunction) {
  try {
    const { guideId } = req.params;
    const body = updateGuideSchema.parse(req.body);
    const existing = await prisma.guide.findUnique({ where: { id: guideId } });
    if (!existing) {
      next(new AppError(404, "Guida non trovata", "NOT_FOUND"));
      return;
    }
    const guide = await prisma.guide.update({
      where: { id: guideId },
      data: body,
      include: {
        steps: { orderBy: { order: "asc" } },
      },
    });
    res.json(guide);
  } catch (e) {
    if (e instanceof z.ZodError) {
      next(new AppError(400, e.errors.map((x) => x.message).join(", "), "VALIDATION_ERROR"));
      return;
    }
    next(e);
  }
}

export async function deleteGuide(req: Request, res: Response, next: NextFunction) {
  try {
    const { guideId } = req.params;
    const guide = await prisma.guide.findUnique({ where: { id: guideId } });
    if (!guide) {
      next(new AppError(404, "Guida non trovata", "NOT_FOUND"));
      return;
    }
    await prisma.guide.delete({ where: { id: guideId } });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

export async function addStep(req: Request, res: Response, next: NextFunction) {
  try {
    const { guideId } = req.params;
    const body = z
      .object({
        title: z.string().min(1).max(200),
        content: z.string().max(10000).optional(),
        order: z.number().int().min(0).optional(),
      })
      .parse(req.body);
    const guide = await prisma.guide.findUnique({ where: { id: guideId }, include: { steps: true } });
    if (!guide) {
      next(new AppError(404, "Guida non trovata", "NOT_FOUND"));
      return;
    }
    const order =
      body.order !== undefined
        ? body.order
        : guide.steps.length > 0
          ? Math.max(...guide.steps.map((s) => s.order)) + 1
          : 0;
    const step = await prisma.guideStep.create({
      data: {
        guideId,
        title: body.title,
        content: body.content ?? null,
        order,
      },
    });
    res.status(201).json(step);
  } catch (e) {
    if (e instanceof z.ZodError) {
      next(new AppError(400, e.errors.map((x) => x.message).join(", "), "VALIDATION_ERROR"));
      return;
    }
    next(e);
  }
}

export async function updateStep(req: Request, res: Response, next: NextFunction) {
  try {
    const { guideId, stepId } = req.params;
    const body = updateStepSchema.parse(req.body);
    const step = await prisma.guideStep.findFirst({
      where: { id: stepId, guideId },
    });
    if (!step) {
      next(new AppError(404, "Step non trovato", "NOT_FOUND"));
      return;
    }
    const updated = await prisma.guideStep.update({
      where: { id: stepId },
      data: body,
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

export async function deleteStep(req: Request, res: Response, next: NextFunction) {
  try {
    const { guideId, stepId } = req.params;
    const step = await prisma.guideStep.findFirst({
      where: { id: stepId, guideId },
    });
    if (!step) {
      next(new AppError(404, "Step non trovato", "NOT_FOUND"));
      return;
    }
    await prisma.guideStep.delete({ where: { id: stepId } });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}
