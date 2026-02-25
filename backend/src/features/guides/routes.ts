import { Router } from "express";
import {
  listGuides,
  getGuide,
  createGuide,
  updateGuide,
  deleteGuide,
  addStep,
  updateStep,
  deleteStep,
} from "./controller.js";

const router = Router();

router.get("/", listGuides);
router.get("/:guideId", getGuide);
router.post("/", createGuide);
router.patch("/:guideId", updateGuide);
router.delete("/:guideId", deleteGuide);
router.post("/:guideId/steps", addStep);
router.patch("/:guideId/steps/:stepId", updateStep);
router.delete("/:guideId/steps/:stepId", deleteStep);

export const guidesRouter = router;
