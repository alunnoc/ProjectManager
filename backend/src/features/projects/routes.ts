import { Router } from "express";
import { listProjects, createProject, getProject, updateProject, deleteProject } from "./controller.js";

const router = Router();

router.get("/", listProjects);
router.post("/", createProject);
router.get("/:id", getProject);
router.patch("/:id", updateProject);
router.delete("/:id", deleteProject);

export const projectsRouter = router;
