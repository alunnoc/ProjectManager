import { Router } from "express";
import { createDeliverable, updateDeliverable, deleteDeliverable, convertDeliverableToTask } from "./controller.js";

const router = Router({ mergeParams: true });

router.post("/", createDeliverable);
router.patch("/:deliverableId", updateDeliverable);
router.delete("/:deliverableId", deleteDeliverable);
router.post("/:deliverableId/convert-to-task", convertDeliverableToTask);

export const deliverablesRouter = router;
