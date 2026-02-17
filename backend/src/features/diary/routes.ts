import { Router } from "express";
import { uploadAny } from "../../lib/multer.js";
import {
  listEntries,
  calendarDaysWithEntries,
  getEntriesByDate,
  createEntry,
  getEntry,
  updateEntry,
  deleteEntry,
  addImage,
  removeImage,
  addComment,
} from "./controller.js";

const router = Router({ mergeParams: true });

router.get("/", listEntries);
router.get("/calendar-days", calendarDaysWithEntries);
router.get("/by-date", getEntriesByDate);
router.post("/", createEntry);
router.get("/:entryId", getEntry);
router.patch("/:entryId", updateEntry);
router.delete("/:entryId", deleteEntry);
router.post("/:entryId/images", uploadAny.single("file"), addImage);
router.delete("/:entryId/images/:imageId", removeImage);
router.post("/:entryId/comments", addComment);

export const diaryRouter = router;
