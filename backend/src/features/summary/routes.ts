import { Router } from "express";
import { uploadJson } from "../../lib/multer.js";
import { getSummary, importFromJson, resetSummaryStructure, updateProjectT0 } from "./controller.js";

const router = Router({ mergeParams: true });

router.get("/", getSummary);
router.post("/import-from-json", uploadJson.single("file"), importFromJson);
router.patch("/t0", updateProjectT0);
router.post("/reset-structure", resetSummaryStructure);

export const summaryRouter = router;
