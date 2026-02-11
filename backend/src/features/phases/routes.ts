import { Router } from "express";
import {
  listPhases,
  createPhase,
  updatePhase,
  deletePhase,
  reorderPhases,
} from "./controller.js";

const router = Router({ mergeParams: true });

router.get("/", listPhases);
router.post("/", createPhase);
router.patch("/:phaseId", updatePhase);
router.delete("/:phaseId", deletePhase);
router.post("/reorder", reorderPhases);

export const phasesRouter = router;
