import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import path from "node:path";
import fs from "node:fs/promises";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional();
const createSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(5000).optional(),
  columnId: z.string(),
  startDate: dateSchema,
  dueDate: dateSchema,
  phaseId: z.string().optional(),
  workPackageId: z.string().optional(),
});
const updateSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(5000).optional(),
  startDate: dateSchema.nullable().optional(),
  dueDate: dateSchema.nullable().optional(),
  phaseId: z.string().nullable().optional(),
  workPackageId: z.string().nullable().optional(),
});
const moveSchema = z.object({ columnId: z.string(), order: z.number().int().min(0) });
const commentSchema = z.object({ content: z.string().min(1).max(2000) });

export async function listTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId } = req.params;
    const tasks = await prisma.task.findMany({
      where: { projectId },
      orderBy: [{ columnId: "asc" }, { order: "asc" }],
      include: { comments: true, attachments: true, phase: true, workPackage: true },
    });
    res.json(tasks);
  } catch (e) {
    next(e);
  }
}

export async function createTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId } = req.params;
    const body = createSchema.parse(req.body);
    const maxOrder = await prisma.task.aggregate({
      where: { columnId: body.columnId },
      _max: { order: true },
    });
    const order = (maxOrder._max.order ?? -1) + 1;
    const task = await prisma.task.create({
      data: {
        projectId,
        columnId: body.columnId,
        title: body.title,
        description: body.description ?? null,
        order,
        startDate: body.startDate ? new Date(body.startDate) : null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        phaseId: body.phaseId ?? null,
        workPackageId: body.workPackageId ?? null,
      },
      include: { comments: true, attachments: true, phase: true, workPackage: true },
    });
    res.status(201).json(task);
  } catch (e) {
    if (e instanceof z.ZodError) {
      next(new AppError(400, e.errors.map((x) => x.message).join(", "), "VALIDATION_ERROR"));
      return;
    }
    next(e);
  }
}

export async function getTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId, taskId } = req.params;
    const task = await prisma.task.findFirst({
      where: { id: taskId, projectId },
      include: { comments: true, attachments: true, phase: true, workPackage: true },
    });
    if (!task) {
      next(new AppError(404, "Task non trovato", "NOT_FOUND"));
      return;
    }
    res.json(task);
  } catch (e) {
    next(e);
  }
}

export async function updateTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId, taskId } = req.params;
    const body = updateSchema.parse(req.body);
    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.startDate !== undefined) data.startDate = body.startDate ? new Date(body.startDate) : null;
    if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.phaseId !== undefined) data.phaseId = body.phaseId;
    if (body.workPackageId !== undefined) data.workPackageId = body.workPackageId;
    const task = await prisma.task.updateMany({
      where: { id: taskId, projectId },
      data,
    });
    if (task.count === 0) {
      next(new AppError(404, "Task non trovato", "NOT_FOUND"));
      return;
    }
    const updated = await prisma.task.findUnique({
      where: { id: taskId },
      include: { comments: true, attachments: true, phase: true, workPackage: true },
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

export async function deleteTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId, taskId } = req.params;
    const task = await prisma.task.findFirst({
      where: { id: taskId, projectId },
      include: { attachments: true },
    });
    if (!task) {
      next(new AppError(404, "Task non trovato", "NOT_FOUND"));
      return;
    }
    for (const att of task.attachments) {
      try {
        await fs.unlink(path.join(process.cwd(), att.path));
      } catch (_) {}
    }
    await prisma.task.delete({ where: { id: taskId } });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

export async function moveTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId, taskId } = req.params;
    const body = moveSchema.parse(req.body);
    const task = await prisma.task.findFirst({ where: { id: taskId, projectId } });
    if (!task) {
      next(new AppError(404, "Task non trovato", "NOT_FOUND"));
      return;
    }
    const sameColumn = task.columnId === body.columnId;
    if (sameColumn) {
      const tasks = await prisma.task.findMany({
        where: { columnId: body.columnId },
        orderBy: { order: "asc" },
      });
      const fromIdx = tasks.findIndex((t) => t.id === taskId);
      if (fromIdx === -1) return next(new AppError(404, "Task non trovato", "NOT_FOUND"));
      const toIdx = Math.min(body.order, tasks.length - 1);
      if (fromIdx === toIdx) {
        const updated = await prisma.task.findUnique({
          where: { id: taskId },
          include: { comments: true, attachments: true, phase: true, workPackage: true },
        });
        return res.json(updated);
      }
      const reordered = [...tasks];
      const [item] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, item);
      await prisma.$transaction(
        reordered.map((t, i) => prisma.task.update({ where: { id: t.id }, data: { order: i } }))
      );
    } else {
      const targetColumnTasks = await prisma.task.findMany({
        where: { columnId: body.columnId },
        orderBy: { order: "asc" },
      });
      const newOrder = Math.min(body.order, targetColumnTasks.length);
      await prisma.$transaction([
        ...targetColumnTasks.slice(newOrder).map((t, i) =>
          prisma.task.update({
            where: { id: t.id },
            data: { order: newOrder + i + 1 },
          })
        ),
        prisma.task.update({
          where: { id: taskId },
          data: { columnId: body.columnId, order: newOrder },
        }),
        ...targetColumnTasks.slice(0, newOrder).map((t, i) =>
          prisma.task.update({ where: { id: t.id }, data: { order: i } })
        ),
      ]);
    }
    const updated = await prisma.task.findUnique({
      where: { id: taskId },
      include: { comments: true, attachments: true, phase: true, workPackage: true },
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

export async function addComment(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId, taskId } = req.params;
    const body = commentSchema.parse(req.body);
    const task = await prisma.task.findFirst({ where: { id: taskId, projectId } });
    if (!task) {
      next(new AppError(404, "Task non trovato", "NOT_FOUND"));
      return;
    }
    const comment = await prisma.taskComment.create({
      data: { taskId, content: body.content },
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

export async function addAttachment(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId, taskId } = req.params;
    const file = req.file;
    if (!file) {
      next(new AppError(400, "Nessun file caricato", "VALIDATION_ERROR"));
      return;
    }
    const task = await prisma.task.findFirst({ where: { id: taskId, projectId } });
    if (!task) {
      next(new AppError(404, "Task non trovato", "NOT_FOUND"));
      return;
    }
    const relativePath = `${process.env.UPLOADS_DIR ?? "uploads"}/${file.filename}`;
    const attachment = await prisma.taskAttachment.create({
      data: {
        taskId,
        filename: file.originalname,
        path: relativePath,
      },
    });
    res.status(201).json(attachment);
  } catch (e) {
    next(e);
  }
}

export async function removeAttachment(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId, taskId, attachmentId } = req.params;
    const attachment = await prisma.taskAttachment.findFirst({
      where: { id: attachmentId, task: { id: taskId, projectId } },
    });
    if (!attachment) {
      next(new AppError(404, "Allegato non trovato", "NOT_FOUND"));
      return;
    }
    try {
      await fs.unlink(path.join(process.cwd(), attachment.path));
    } catch (_) {}
    await prisma.taskAttachment.delete({ where: { id: attachmentId } });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}
