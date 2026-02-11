import { Router } from "express";
import {
  listWorkPackages,
  createWorkPackage,
  updateWorkPackage,
  deleteWorkPackage,
  reorderWorkPackages,
} from "./controller.js";

const router = Router({ mergeParams: true });

router.get("/", listWorkPackages);
router.post("/", createWorkPackage);
router.patch("/:workPackageId", updateWorkPackage);
router.delete("/:workPackageId", deleteWorkPackage);
router.post("/reorder", reorderWorkPackages);

export const workPackagesRouter = router;
