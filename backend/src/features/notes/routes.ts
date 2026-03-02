import { Router } from "express";
import { listNotes, createNote, updateNote, deleteNote } from "./controller.js";

const router = Router({ mergeParams: true });

router.get("/", listNotes);
router.post("/", createNote);
router.patch("/:noteId", updateNote);
router.delete("/:noteId", deleteNote);

export const notesRouter = router;
