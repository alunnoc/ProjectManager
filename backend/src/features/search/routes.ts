import { Router } from "express";
import { fullTextSearch } from "./controller.js";

const router = Router();

router.get("/", fullTextSearch);

export const searchRouter = router;
