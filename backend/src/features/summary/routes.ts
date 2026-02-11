import { Router } from "express";
import { getSummary } from "./controller.js";

const router = Router({ mergeParams: true });

router.get("/", getSummary);

export const summaryRouter = router;
