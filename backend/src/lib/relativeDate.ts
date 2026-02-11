/**
 * Parser per date relative in formato T0 e T0+N unità (es. T0+3mesi, T0+1anno).
 * Usato nell'import JSON e nel ricalcolo quando cambia la data T0 del progetto.
 */

/** Indica se la stringa è una data relativa (T0 o T0+N...) */
export function isRelativeDate(s: string | undefined): boolean {
  if (!s || typeof s !== "string") return false;
  const t = s.trim();
  return t === "T0" || /^T0\s*\+/i.test(t);
}

/**
 * Calcola la data assoluta a partire da T0.
 * Formato: "T0" oppure "T0+N unità" dove unità = giorni|giorno|settimane|settimana|mesi|mese|anni|anno
 * Esempi: "T0", "T0+3mesi", "T0+1 anno", "T0+2settimane", "T0+15giorni"
 */
export function parseRelativeDate(expr: string | undefined, t0: Date): Date | null {
  if (!expr || typeof expr !== "string") return null;
  const t = expr.trim();
  if (t === "T0" || t.toUpperCase() === "T0") {
    const d = new Date(t0);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const match = t.match(/^T0\s*\+\s*(\d+)\s*(giorni?|settimane?|mes(e|i)|ann(o|i))$/i);
  if (!match) return null;
  const [, numStr, unit] = match;
  const n = parseInt(numStr, 10);
  if (isNaN(n)) return null;
  const result = new Date(t0);
  result.setHours(0, 0, 0, 0);
  const u = unit.toLowerCase();
  if (u.startsWith("giorn")) {
    result.setDate(result.getDate() + n);
  } else if (u.startsWith("settiman")) {
    result.setDate(result.getDate() + n * 7);
  } else if (u.startsWith("mes")) {
    result.setMonth(result.getMonth() + n);
  } else if (u.startsWith("ann")) {
    result.setFullYear(result.getFullYear() + n);
  } else {
    return null;
  }
  return result;
}

/**
 * Dato un valore da JSON (data assoluta YYYY-MM-DD o relativa T0+...),
 * restituisce { date: Date | null, relative: string | null }.
 */
export function parseDateOrRelative(
  value: string | undefined,
  t0: Date | null
): { date: Date | null; relative: string | null } {
  if (!value || typeof value !== "string") return { date: null, relative: null };
  const v = value.trim();
  if (isRelativeDate(v)) {
    if (!t0) return { date: null, relative: v };
    const date = parseRelativeDate(v, t0);
    return { date, relative: v };
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    return { date: new Date(v), relative: null };
  }
  return { date: null, relative: null };
}
