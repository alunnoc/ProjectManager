/**
 * Seed script: importa le guide dalla cartella Guide/ nel database.
 * Esegui da project root: npx tsx backend/scripts/seed-guides.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

// Guide/ può essere in project root (se run da root) o in parent (se run da backend/)
const cwd = process.cwd();
const GUIDE_DIR =
  fs.existsSync(path.join(cwd, "Guide"))
    ? path.join(cwd, "Guide")
    : path.join(cwd, "..", "Guide");

function toTitle(filename: string): string {
  const base = path.basename(filename, path.extname(filename));
  return base
    .replace(/[-_]/g, " ")
    .replace(/\.(txt|md)$/i, "")
    .replace(/^(\w)/, (m) => m.toUpperCase());
}

function splitIntoSteps(content: string): { title: string; content: string }[] {
  const lines = content.split(/\r?\n/);
  const steps: { title: string; content: string }[] = [];
  let current: string[] = [];
  let currentTitle = "";

  for (const line of lines) {
    const bulletMatch = line.match(/^[-*]\s+(.+)/);
    const numberedMatch = line.match(/^\d+[.)]\s+(.+)/);
    const doubleDash = line.match(/^---\s*(.+)/);

    if (bulletMatch || numberedMatch || doubleDash) {
      const text = (bulletMatch?.[1] ?? numberedMatch?.[1] ?? doubleDash?.[1] ?? "").trim();
      if (text && text.length > 3) {
        if (current.length > 0) {
          steps.push({
            title: currentTitle || "Passaggio",
            content: current.join("\n").trim().slice(0, 8000),
          });
        }
        currentTitle = text.slice(0, 150);
        current = [line];
      } else {
        current.push(line);
      }
    } else if (line.trim() === "" && current.length > 0 && currentTitle) {
      steps.push({
        title: currentTitle,
        content: current.join("\n").trim().slice(0, 8000),
      });
      current = [];
      currentTitle = "";
    } else {
      if (!currentTitle && line.trim().length > 2) {
        currentTitle = line.trim().slice(0, 150);
      }
      current.push(line);
    }
  }

  if (current.length > 0) {
    steps.push({
      title: currentTitle || "Contenuto",
      content: current.join("\n").trim().slice(0, 8000),
    });
  }

  if (steps.length === 0 && content.trim()) {
    const blocks = content.split(/\n\n+/);
    return blocks
      .filter((b) => b.trim().length > 10)
      .slice(0, 50)
      .map((b, i) => ({
        title: `Passaggio ${i + 1}`,
        content: b.trim().slice(0, 8000),
      }));
  }

  return steps;
}

function getTextFiles(dir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && !e.name.startsWith(".") && e.name !== "VHDL_Guide" && e.name !== "patchGmx" && e.name !== "UdpSend") {
      files.push(...getTextFiles(full));
    } else if (e.isFile()) {
      const ext = path.extname(e.name).toLowerCase();
      const noExt = !ext || ext === "";
      const base = path.basename(e.name);
      if (
        ext === ".txt" ||
        ext === ".md" ||
        (noExt && !base.includes(".") && base.length < 50 && !/\.(c|o|out|patch|scr|tsm)$/i.test(base))
      ) {
        files.push(full);
      }
    }
  }
  return files;
}

async function main() {
  if (!fs.existsSync(GUIDE_DIR)) {
    console.error("Cartella Guide/ non trovata. Path:", GUIDE_DIR);
    process.exit(1);
  }

  const files = getTextFiles(GUIDE_DIR);
  console.log(`Trovati ${files.length} file in Guide/`);

  let created = 0;
  let skipped = 0;

  for (const filePath of files) {
    const relPath = path.relative(GUIDE_DIR, filePath);
    const title = toTitle(relPath);

    try {
      const raw = fs.readFileSync(filePath, "utf-8").replace(/\0/g, "");
      const content = raw.trim();
      if (content.length < 20) {
        skipped++;
        continue;
      }

      const steps = splitIntoSteps(content);
      if (steps.length === 0) {
        steps.push({ title: "Contenuto", content: content.slice(0, 8000) });
      }

      const existing = await prisma.guide.findFirst({ where: { title } });
      if (existing) {
        skipped++;
        continue;
      }

      const maxOrder = await prisma.guide.aggregate({ _max: { sortOrder: true } });
      const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

      await prisma.guide.create({
        data: {
          title,
          description: `Importata da ${relPath}`,
          sortOrder,
          steps: {
            create: steps.map((s, i) => ({
              title: s.title,
              content: s.content,
              order: i,
            })),
          },
        },
      });
      created++;
      console.log(`  + ${title}`);
    } catch (err) {
      console.warn(`  ! Skip ${relPath}:`, err instanceof Error ? err.message : err);
      skipped++;
    }
  }

  console.log(`\nFatto: ${created} guide create, ${skipped} saltate.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
