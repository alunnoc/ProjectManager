import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { DayPicker } from "react-day-picker";
import { apiGet, uploadsUrl } from "@/api/client";
import type { DiaryEntry } from "@/types";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarDays, FileText, ImageIcon, MessageCircle } from "lucide-react";

export function ProjectCalendar() {
  const { projectId } = useParams<{ projectId: string }>();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [daysWithEntries, setDaysWithEntries] = useState<string[]>([]);
  const [entriesForDay, setEntriesForDay] = useState<DiaryEntry[]>([]);
  const [loadingDays, setLoadingDays] = useState(false);
  const [loadingEntries, setLoadingEntries] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    setLoadingDays(true);
    apiGet<{ dates: string[] }>(
      `/projects/${projectId}/diary/calendar-days?year=${currentMonth.getFullYear()}&month=${currentMonth.getMonth() + 1}`
    )
      .then((data) => setDaysWithEntries(data.dates))
      .catch(console.error)
      .finally(() => setLoadingDays(false));
  }, [projectId, currentMonth.getFullYear(), currentMonth.getMonth()]);

  useEffect(() => {
    if (!projectId || !selectedDate) {
      setEntriesForDay([]);
      return;
    }
    setLoadingEntries(true);
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    apiGet<DiaryEntry[]>(
      `/projects/${projectId}/diary/by-date?date=${dateStr}`
    )
      .then(setEntriesForDay)
      .catch(console.error)
      .finally(() => setLoadingEntries(false));
  }, [projectId, selectedDate?.toISOString()]);

  const hasEntry = (date: Date) => {
    const d = format(date, "yyyy-MM-dd");
    return daysWithEntries.includes(d);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
          <CalendarDays className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-[var(--accent)]">
            Calendario
          </h2>
          <p className="text-sm text-[var(--muted)]">
            Clicca su un giorno per vedere i resoconti
          </p>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-8 xl:gap-10">
        {/* Calendario */}
        <div className="shrink-0">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
            <div className="px-6 pt-6 pb-2">
              <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                Mese
              </p>
            </div>
            <div className="p-4 pt-0">
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                locale={it}
                className="rdp calendar-picker"
                modifiers={{
                  hasEntry: (date) => hasEntry(date),
                }}
                modifiersClassNames={{
                  hasEntry: "rdp-day_has_entry",
                }}
              />
            </div>
            <div className="px-6 pb-5 pt-1 flex items-center gap-2 text-xs text-[var(--muted)]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                Giorni con resoconti
              </span>
            </div>
          </div>
        </div>

        {/* Pannello resoconti */}
        <div className="flex-1 min-w-0">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden min-h-[320px]">
            {selectedDate ? (
              <>
                <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--surface-hover)]/50">
                  <h3 className="font-semibold text-[var(--accent)]">
                    {format(selectedDate, "EEEE d MMMM yyyy", { locale: it })}
                  </h3>
                </div>
                <div className="p-6">
                  {loadingEntries ? (
                    <div className="flex flex-col items-center justify-center py-16 text-[var(--muted)]">
                      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
                      <p className="text-sm">Caricamento...</p>
                    </div>
                  ) : entriesForDay.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-[var(--muted)]">
                      <FileText className="w-12 h-12 mb-3 opacity-40" />
                      <p className="text-sm font-medium">Nessun resoconto</p>
                      <p className="text-xs mt-1">Per questa data non ci sono voci nel diario.</p>
                    </div>
                  ) : (
                    <ul className="space-y-5">
                      {entriesForDay.map((entry) => (
                        <li
                          key={entry.id}
                          className="rounded-xl border border-[var(--border)] bg-[var(--surface-hover)]/30 p-5 hover:border-indigo-200 dark:hover:border-indigo-800/50 transition-colors"
                        >
                          {entry.content && (
                            <p className="text-[var(--accent)] whitespace-pre-wrap text-[15px] leading-relaxed mb-4">
                              {entry.content}
                            </p>
                          )}
                          {entry.images && entry.images.length > 0 && (
                            <div className="mb-4">
                              <div className="flex items-center gap-2 text-[var(--muted)] text-xs font-medium mb-2">
                                <ImageIcon className="w-3.5 h-3.5" />
                                Immagini
                              </div>
                              <div className="flex flex-wrap gap-3">
                                {entry.images.map((img) => (
                                  <a
                                    key={img.id}
                                    href={uploadsUrl(img.path)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block rounded-lg overflow-hidden border border-[var(--border)] hover:ring-2 hover:ring-indigo-400 transition-shadow"
                                  >
                                    <img
                                      src={uploadsUrl(img.path)}
                                      alt={img.filename}
                                      className="w-24 h-24 object-cover"
                                    />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                          {entry.comments && entry.comments.length > 0 && (
                            <div className="pt-3 border-t border-[var(--border)]">
                              <div className="flex items-center gap-2 text-[var(--muted)] text-xs font-medium mb-2">
                                <MessageCircle className="w-3.5 h-3.5" />
                                Commenti
                              </div>
                              <ul className="space-y-2">
                                {entry.comments.map((c) => (
                                  <li
                                    key={c.id}
                                    className="text-sm text-[var(--accent-soft)] pl-3 border-l-2 border-indigo-200 dark:border-indigo-800"
                                  >
                                    {c.content}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <div className="p-4 rounded-2xl bg-[var(--surface-hover)] text-[var(--muted)] mb-4">
                  <CalendarDays className="w-10 h-10" />
                </div>
                <p className="font-medium text-[var(--accent)]">Seleziona un giorno</p>
                <p className="text-sm text-[var(--muted)] mt-1 max-w-xs">
                  Clicca su una data nel calendario per visualizzare i resoconti del diario.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
