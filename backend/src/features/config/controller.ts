import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";

// Tipi predefiniti (slug -> nome visibile)
export const SECTION_TYPE_OPTIONS: { slug: string; label: string }[] = [
  { slug: "links", label: "Risorse e link" },
  { slug: "repo", label: "Repository" },
  { slug: "docs", label: "Documentazione" },
  { slug: "other", label: "Altro (personalizzato)" },
];

const createSectionSchema = z.object({
  name: z.string().min(1).max(120),
  typeSlug: z.enum(["links", "repo", "docs", "other"]).optional().nullable(),
});
const updateSectionSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  typeSlug: z.enum(["links", "repo", "docs", "other"]).nullable().optional(),
});

const createLinkSchema = z.object({
  label: z.string().min(1).max(200),
  url: z.string().url().optional().or(z.literal("")),
});
const updateLinkSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  url: z.string().url().optional().nullable().or(z.literal("")),
});

// Opzioni tipo sezione (anche per API se servisse)
export async function getSectionTypes(_req: Request, res: Response) {
  res.json(SECTION_TYPE_OPTIONS);
}

// ---------- Sezioni ----------
export async function listSections(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId } = req.params;
    const sections = await prisma.projectConfigSection.findMany({
      where: { projectId },
      orderBy: { order: "asc" },
      include: { links: { orderBy: { order: "asc" } } },
    });
    res.json(sections);
  } catch (e) {
    next(e);
  }
}

export async function createSection(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId } = req.params;
    const body = createSectionSchema.parse(req.body);
    const typeSlug = body.typeSlug === "other" ? null : (body.typeSlug ?? null);
    const name = body.name.trim();
    const maxOrder = await prisma.projectConfigSection.aggregate({
      where: { projectId },
      _max: { order: true },
    });
    const order = (maxOrder._max.order ?? -1) + 1;
    const section = await prisma.projectConfigSection.create({
      data: { projectId, name, typeSlug, order },
      include: { links: true },
    });
    res.status(201).json(section);
  } catch (e) {
    if (e instanceof z.ZodError) {
      next(new AppError(400, e.errors.map((x) => x.message).join(", "), "VALIDATION_ERROR"));
      return;
    }
    next(e);
  }
}

export async function updateSection(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId, sectionId } = req.params;
    const body = updateSectionSchema.parse(req.body);
    const data: { name?: string; typeSlug?: string | null } = {};
    if (body.name !== undefined) data.name = body.name.trim();
    if (body.typeSlug !== undefined) data.typeSlug = body.typeSlug === "other" ? null : body.typeSlug;
    const section = await prisma.projectConfigSection.updateMany({
      where: { id: sectionId, projectId },
      data,
    });
    if (section.count === 0) {
      next(new AppError(404, "Sezione non trovata", "NOT_FOUND"));
      return;
    }
    const updated = await prisma.projectConfigSection.findUnique({
      where: { id: sectionId },
      include: { links: true },
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

export async function deleteSection(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId, sectionId } = req.params;
    const result = await prisma.projectConfigSection.deleteMany({
      where: { id: sectionId, projectId },
    });
    if (result.count === 0) {
      next(new AppError(404, "Sezione non trovata", "NOT_FOUND"));
      return;
    }
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

// ---------- Link (dentro una sezione) ----------
export async function createLink(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId, sectionId } = req.params;
    const body = createLinkSchema.parse(req.body);
    const section = await prisma.projectConfigSection.findFirst({
      where: { id: sectionId, projectId },
    });
    if (!section) {
      next(new AppError(404, "Sezione non trovata", "NOT_FOUND"));
      return;
    }
    const url = body.url === "" || body.url === undefined ? null : body.url ?? null;
    const maxOrder = await prisma.projectLink.aggregate({
      where: { sectionId },
      _max: { order: true },
    });
    const order = (maxOrder._max.order ?? -1) + 1;
    const link = await prisma.projectLink.create({
      data: { projectId, sectionId, label: body.label.trim(), url, order },
    });
    res.status(201).json(link);
  } catch (e) {
    if (e instanceof z.ZodError) {
      next(new AppError(400, e.errors.map((x) => x.message).join(", "), "VALIDATION_ERROR"));
      return;
    }
    next(e);
  }
}

export async function updateLink(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId, sectionId, linkId } = req.params;
    const body = updateLinkSchema.parse(req.body);
    const data: { label?: string; url?: string | null } = {};
    if (body.label !== undefined) data.label = body.label.trim();
    if (body.url !== undefined) data.url = body.url === "" ? null : body.url;
    const link = await prisma.projectLink.updateMany({
      where: { id: linkId, sectionId, projectId },
      data,
    });
    if (link.count === 0) {
      next(new AppError(404, "Link non trovato", "NOT_FOUND"));
      return;
    }
    const updated = await prisma.projectLink.findUnique({ where: { id: linkId } });
    res.json(updated);
  } catch (e) {
    if (e instanceof z.ZodError) {
      next(new AppError(400, e.errors.map((x) => x.message).join(", "), "VALIDATION_ERROR"));
      return;
    }
    next(e);
  }
}

export async function deleteLink(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId, sectionId, linkId } = req.params;
    const result = await prisma.projectLink.deleteMany({
      where: { id: linkId, sectionId, projectId },
    });
    if (result.count === 0) {
      next(new AppError(404, "Link non trovato", "NOT_FOUND"));
      return;
    }
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}
