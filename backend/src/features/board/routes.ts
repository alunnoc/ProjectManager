import { Router } from "express";
import { listColumns, createColumn, updateColumn, deleteColumn, reorderColumns } from "./controller.js";

const router = Router({ mergeParams: true });

router.get("/", listColumns);
router.post("/", createColumn);
router.patch("/:columnId", updateColumn);
router.delete("/:columnId", deleteColumn);
router.post("/reorder", reorderColumns);

export const boardRouter = router;
