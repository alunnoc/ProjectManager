import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";
import { randomUUID } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "..", "..", process.env.UPLOADS_DIR ?? "uploads");

// Path relativo alla root backend per DB (es. "uploads/xxx.jpg")
const UPLOADS_REL = process.env.UPLOADS_DIR ?? "uploads";

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    const name = `${randomUUID()}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = /^image\/(jpeg|png|gif|webp)$/i.test(file.mimetype);
  if (allowed) cb(null, true);
  else cb(new Error("Solo immagini (jpeg, png, gif, webp) consentite"));
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

/** Come upload ma accetta qualsiasi tipo di file (per es. allegati resoconti). */
export const uploadAny = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// Per import JSON: solo memoria, nessun filtro tipo (max 2 MB)
export const uploadJson = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});
