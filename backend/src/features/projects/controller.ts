import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";

const createSchema = z.object({ name: z.string().min(1).max(200) });
const updateSchema = z.object({ name: z.string().min(1).max(200).optional() });

export async function listProjects(_req: Request, res: Response, next: NextFunction) {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { tasks: true, diaryEntries: true } },
      },
    });
    res.json(projects);
  } catch (e) {
    next(e);
  }
}

export async function createProject(req: Request, res: Response, next: NextFunction) {
  try {
    const body = createSchema.parse(req.body);
    const withColumns = await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: { name: body.name },
      });
      await tx.boardColumn.createMany({
        data: [
          { projectId: project.id, name: "Da fare", order: 0 },
          { projectId: project.id, name: "In corso", order: 1 },
          { projectId: project.id, name: "Completato", order: 2 },
        ],
      });
      return tx.project.findUnique({
        where: { id: project.id },
        include: { columns: { orderBy: { order: "asc" } } },
      });
    });
    if (!withColumns) {
      next(new AppError(500, "Progetto non trovato dopo la creazione", "INTERNAL_ERROR"));
      return;
    }
    res.status(201).json(withColumns);
  } catch (e) {
    if (e instanceof z.ZodError) {
      next(new AppError(400, e.errors.map((x) => x.message).join(", "), "VALIDATION_ERROR"));
      return;
    }
    next(e);
  }
}

export async function getProject(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        columns: { orderBy: { order: "asc" }, include: { _count: { select: { tasks: true } } } },
        _count: { select: { tasks: true, diaryEntries: true } },
      },
    });
    if (!project) {
      next(new AppError(404, "Progetto non trovato", "NOT_FOUND"));
      return;
    }
    res.json(project);
  } catch (e) {
    next(e);
  }
}

export async function updateProject(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const body = updateSchema.parse(req.body);
    const project = await prisma.project.update({
      where: { id },
      data: body,
    });
    res.json(project);
  } catch (e) {
    if (e instanceof z.ZodError) {
      next(new AppError(400, e.errors.map((x) => x.message).join(", "), "VALIDATION_ERROR"));
      return;
    }
    next(e);
  }
}

export async function deleteProject(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    await prisma.project.delete({ where: { id } });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}
