import { describe, it } from "node:test";
import assert from "node:assert";
import { TASK_CATEGORIES } from "./controller.ts";

describe("TASK_CATEGORIES", () => {
  const expected = ["document", "block_diagram", "prototype", "report", "code", "test", "other"];

  it("ha esattamente le 7 categorie previste", () => {
    assert.strictEqual(TASK_CATEGORIES.length, 7);
  });

  it("contiene tutte le categorie disponibili per il colore bordo", () => {
    for (const cat of expected) {
      assert(TASK_CATEGORIES.includes(cat as (typeof TASK_CATEGORIES)[number]), `manca categoria: ${cat}`);
    }
  });

  it("non contiene valori duplicati", () => {
    const set = new Set(TASK_CATEGORIES);
    assert.strictEqual(set.size, TASK_CATEGORIES.length);
  });

  it("ogni categoria è una stringa non vuota", () => {
    for (const cat of TASK_CATEGORIES) {
      assert(typeof cat === "string" && cat.length > 0, `categoria non valida: ${cat}`);
    }
  });
});
