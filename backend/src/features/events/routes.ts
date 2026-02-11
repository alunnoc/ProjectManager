import { Router } from "express";
import {
  listEvents,
  calendarDaysWithEvents,
  getEventsByDate,
  createEvent,
  updateEvent,
  deleteEvent,
} from "./controller.js";

const router = Router({ mergeParams: true });

router.get("/", listEvents);
router.get("/calendar-days", calendarDaysWithEvents);
router.get("/by-date", getEventsByDate);
router.post("/", createEvent);
router.patch("/:eventId", updateEvent);
router.delete("/:eventId", deleteEvent);

export const eventsRouter = router;
