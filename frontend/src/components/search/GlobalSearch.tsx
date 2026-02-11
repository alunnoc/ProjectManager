import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { apiGet } from "@/api/client";
import type { SearchResult } from "@/types";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface GlobalSearchProps {
  onClose: () => void;
}

/** Evidenzia il termine cercato nel testo */
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(re);
  const q = query.toLowerCase();
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === q ? (
          <mark key={i} className="bg-amber-200 dark:bg-amber-600/50 rounded px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

export function GlobalSearch({ onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults(null);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await apiGet<SearchResult>(`/search?q=${encodeURIComponent(query)}`);
        setResults(data);
      } catch {
        setResults({ tasks: [], diary: [] });
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] sm:pt-[10vh] px-2 sm:px-4 pb-4 bg-black/40 animate-fade-in">
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl w-full max-w-2xl h-[90vh] sm:h-[85vh] sm:max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 p-3 border-b border-[var(--border)] shrink-0">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca..."
            className="flex-1 bg-transparent border-0 outline-none text-[var(--accent)] placeholder:text-[var(--muted)] text-base min-h-[44px]"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
            aria-label="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {query.length > 0 && query.length < 2 && (
            <p className="text-sm text-[var(--muted)]">Scrivi almeno 2 caratteri</p>
          )}
          {loading && <p className="text-sm text-[var(--muted)]">Ricerca...</p>}
          {results && !loading && (
            <>
              {results.tasks.length === 0 && results.diary.length === 0 && (
                <p className="text-sm text-[var(--muted)]">Nessun risultato</p>
              )}
              {results.tasks.length > 0 && (
                <section className="mb-6">
                  <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">
                    Task
                  </h3>
                  <ul className="space-y-2">
                    {results.tasks.map((t) => (
                      <li key={t.id}>
                        <Link
                          to={`/project/${t.projectId}/board`}
                          onClick={onClose}
                          className="block p-3 rounded-lg bg-[var(--surface-hover)] hover:ring-2 ring-indigo-400 transition-all"
                        >
                          <span className="font-medium text-[var(--accent)]">
                            <Highlight text={t.title} query={query} />
                          </span>
                          {t.description && (
                            <p className="text-sm text-[var(--muted)] mt-1 line-clamp-2">
                              <Highlight text={t.description} query={query} />
                            </p>
                          )}
                          <p className="text-xs text-[var(--muted)] mt-1">
                            {t.project?.name} · {t.column?.name}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {results.diary.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">
                    Diario
                  </h3>
                  <ul className="space-y-2">
                    {results.diary.map((e) => (
                      <li key={e.id}>
                        <Link
                          to={`/project/${e.projectId}/calendar`}
                          onClick={onClose}
                          className="block p-3 rounded-lg bg-[var(--surface-hover)] hover:ring-2 ring-indigo-400 transition-all"
                        >
                          <span className="text-sm text-[var(--muted)]">
                            {format(new Date(e.date), "d MMMM yyyy", { locale: it })}
                          </span>
                          {e.content && (
                            <p className="text-[var(--accent)] mt-1 line-clamp-2">
                              <Highlight text={e.content} query={query} />
                            </p>
                          )}
                          <p className="text-xs text-[var(--muted)] mt-1">
                            {e.project?.name}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </div>
      <button
        type="button"
        className="absolute inset-0 -z-10"
        onClick={onClose}
        aria-label="Chiudi"
      />
    </div>
  );
}
