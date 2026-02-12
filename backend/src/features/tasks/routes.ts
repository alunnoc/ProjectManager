import { Router } from "express";
import { upload } from "../../lib/multer.js";
import {
  listTasks,
  getNearestDueTasks,
  createTask,
  getTask,
  updateTask,
  deleteTask,
  moveTask,
  addComment,
  addAttachment,
  removeAttachment,
} from "./controller.js";

const router = Router({ mergeParams: true });

router.get("/", listTasks);
router.get("/nearest-due", getNearestDueTasks);
router.post("/", createTask);
router.get("/:taskId", getTask);
router.patch("/:taskId", updateTask);
router.delete("/:taskId", deleteTask);
router.post("/:taskId/move", moveTask);
router.post("/:taskId/comments", addComment);
router.post("/:taskId/attachments", upload.single("file"), addAttachment);
router.delete("/:taskId/attachments/:attachmentId", removeAttachment);

export const tasksRouter = router;
