/**
 * Gestione Progetti - Backend API
 * Entry point del server Express
 * Carica .env per primo così DATABASE_URL è disponibile per Prisma
 */
import "dotenv/config";

import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { projectsRouter } from "./features/projects/routes.js";
import { boardRouter } from "./features/board/routes.js";
import { tasksRouter } from "./features/tasks/routes.js";
import { diaryRouter } from "./features/diary/routes.js";
import { configRouter } from "./features/config/routes.js";
import { phasesRouter } from "./features/phases/routes.js";
import { workPackagesRouter } from "./features/workpackages/routes.js";
import { summaryRouter } from "./features/summary/routes.js";
import { deliverablesRouter } from "./features/deliverables/routes.js";
import { eventsRouter } from "./features/events/routes.js";
import { searchRouter } from "./features/search/routes.js";

import { errorHandler } from "./middleware/errorHandler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT ?? 3001;

// Middleware: in sviluppo accetta anche richieste dal telefono (es. http://192.168.x.x:5173)
const corsOrigin =
  process.env.NODE_ENV === "production"
    ? process.env.FRONTEND_URL ?? "http://localhost:5173"
    : (origin: string | undefined, cb: (err: null, allow: boolean) => void) => {
        if (!origin) return cb(null, true);
        if (origin === "http://localhost:5173" || origin.endsWith(":5173")) return cb(null, true);
        if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) return cb(null, true);
        cb(null, true); // in dev accetta comunque (es. Postman)
      };
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

// Servire file statici per le immagini caricate
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// API routes
app.use("/api/projects", projectsRouter);
app.use("/api/projects/:projectId/board", boardRouter);
app.use("/api/projects/:projectId/tasks", tasksRouter);
app.use("/api/projects/:projectId/diary", diaryRouter);
app.use("/api/projects/:projectId/phases", phasesRouter);
app.use("/api/projects/:projectId/work-packages", workPackagesRouter);
app.use("/api/projects/:projectId/summary", summaryRouter);
app.use("/api/projects/:projectId/deliverables", deliverablesRouter);
app.use("/api/projects/:projectId/events", eventsRouter);
app.use("/api/projects/:projectId", configRouter);
app.use("/api/search", searchRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Error handler globale
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server in ascolto su http://localhost:${PORT}`);
});
