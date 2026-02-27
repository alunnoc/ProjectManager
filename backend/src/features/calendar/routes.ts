import { Router } from "express";
import { calendarDaysWithData, getDataByDate } from "./controller.js";

const router = Router();

router.get("/calendar-days", calendarDaysWithData);
router.get("/by-date", getDataByDate);

export const calendarRouter = router;
