import { Router } from "express";
import {
  getSectionTypes,
  listSections,
  createSection,
  updateSection,
  deleteSection,
  createLink,
  updateLink,
  deleteLink,
} from "./controller.js";

const router = Router({ mergeParams: true });

router.get("/section-types", getSectionTypes);
router.get("/sections", listSections);
router.post("/sections", createSection);
router.patch("/sections/:sectionId", updateSection);
router.delete("/sections/:sectionId", deleteSection);

router.post("/sections/:sectionId/links", createLink);
router.patch("/sections/:sectionId/links/:linkId", updateLink);
router.delete("/sections/:sectionId/links/:linkId", deleteLink);

export const configRouter = router;
