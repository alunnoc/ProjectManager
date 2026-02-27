import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DayPicker } from "react-day-picker";
import { apiGet, uploadsUrl } from "@/api/client";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarDays, FileText, Video, Users, Calendar, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp|svg)$/i;
function isImageFile(filename: string) {
  return IMAGE_EXT.test(filename);
}

const EVENT_TYPES = [
  { value: "call", label: "Call", icon: Video },
  { value: "meeting", label: "Meeting", icon: Users },
  { value: "other", label: "Altro", icon: Calendar },
];

/** Colore badge coerente per progetto (basato su hash del nome) */
const PROJECT_COLORS = [
  "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300 border-violet-200 dark:border-violet-800",
  "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 border-teal-200 dark:border-teal-800",
];

function projectColorIndex(projectName: string): number {
  let hash = 0;
  for (let i = 0; i < projectName.length; i++) {
    hash = ((hash << 5) - hash) + projectName.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % PROJECT_COLORS.length;
}

function projectBadgeClass(projectName: string): string {
  return PROJECT_COLORS[projectColorIndex(projectName)];
}

interface DiaryEntryWithProject {
  id: string;
  projectId: string;
  date: string;
  content: string | null;
  createdAt: string;
  images?: { id: string; filename: string; path: string }[];
  comments?: { id: string; content: string }[];
  project: { id: string; name: string };
}

interface EventWithProject {
  id: string;
  projectId: string;
  date: string;
  time: string | null;
  type: string;
  name: string;
  notes: string | null;
  meetingMinutes?: string | null;
  project: { id: string; name: string };
}

interface CalendarDayData {
  diaryEntries: DiaryEntryWithProject[];
  events: EventWithProject[];
}

export function GlobalCalendar() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [daysWithEntries, setDaysWithEntries] = useState<string[]>([]);
  const [daysWithEvents, setDaysWithEvents] = useState<string[]>([]);
  const [dayData, setDayData] = useState<CalendarDayData | null>(null);
  const [loadingDays, setLoadingDays] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  const [expandedEntryIds, setExpandedEntryIds] = useState<Set<string>>(new Set());

  const toggleEntryExpanded = (id: string) => {
    setExpandedEntryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    setLoadingDays(true);
    apiGet<{ diaryDates: string[]; eventDates: string[] }>(
      `/calendar/calendar-days?year=${currentMonth.getFullYear()}&month=${currentMonth.getMonth() + 1}`
    )
      .then((res) => {
        setDaysWithEntries(res.diaryDates ?? []);
        setDaysWithEvents(res.eventDates ?? []);
      })
      .catch(() => {
        setDaysWithEntries([]);
        setDaysWithEvents([]);
      })
      .finally(() => setLoadingDays(false));
  }, [currentMonth.getFullYear(), currentMonth.getMonth()]);

  useEffect(() => {
    if (!selectedDate) {
      setDayData(null);
      return;
    }
    setLoadingContent(true);
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    apiGet<CalendarDayData>(`/calendar/by-date?date=${dateStr}`)
      .then(setDayData)
      .catch(() => setDayData(null))
      .finally(() => setLoadingContent(false));
  }, [selectedDate?.toISOString()]);

  useEffect(() => {
    setExpandedEntryIds(new Set());
  }, [selectedDate?.toISOString()]);

  const hasEntry = (date: Date) => daysWithEntries.includes(format(date, "yyyy-MM-dd"));
  const hasEvent = (date: Date) => daysWithEvents.includes(format(date, "yyyy-MM-dd"));

  const goToProjectCalendar = (projectId: string) => {
    const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
    navigate(`/project/${projectId}/calendar?date=${dateStr}`);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
          <CalendarDays className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-[var(--accent)]">Calendario generale</h2>
          <p className="text-sm text-[var(--muted)]">Resoconti e eventi di tutti i progetti</p>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-8 xl:gap-10">
        <div className="shrink-0">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
            <div className="px-6 pt-6 pb-2">
              <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Mese</p>
            </div>
            <div className="p-4 pt-0 relative">
              {loadingDays && (
                <div className="absolute inset-0 bg-[var(--surface)]/80 z-10 flex items-center justify-center rounded-lg">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                locale={it}
                className="rdp calendar-picker"
                modifiers={{
                  hasEntry,
                  hasEvent,
                }}
                modifiersClassNames={{
                  hasEntry: "rdp-day_has_entry",
                  hasEvent: "rdp-day_has_event",
                }}
              />
            </div>
            <div className="px-6 pb-5 pt-1 flex flex-wrap items-center gap-4 text-xs text-[var(--muted)]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Resoconti
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                Eventi
              </span>
            </div>
          </div>
        </div>

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
                  {loadingContent ? (
                    <div className="flex flex-col items-center justify-center py-16 text-[var(--muted)]">
                      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
                      <p className="text-sm">Caricamento...</p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {/* Eventi */}
                      {dayData?.events && dayData.events.length > 0 && (
                        <div>
                          <p className="flex items-center gap-2 text-xs font-medium text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-3">
                            <Calendar className="w-3.5 h-3.5" />
                            Eventi
                          </p>
                          <ul className="space-y-3">
                            {dayData.events.map((ev) => (
                              <li
                                key={ev.id}
                                className="rounded-xl border border-sky-200 dark:border-sky-800/50 bg-sky-50/60 dark:bg-sky-900/20 p-4"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                      <span
                                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium truncate max-w-[140px] ${projectBadgeClass(ev.project.name)}`}
                                        title={ev.project.name}
                                      >
                                        {ev.project.name}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sky-700 dark:text-sky-300 font-medium">
                                      {(() => {
                                        const T = EVENT_TYPES.find((t) => t.value === ev.type)?.icon ?? Calendar;
                                        return <T className="w-4 h-4 shrink-0" />;
                                      })()}
                                      {ev.name}
                                      {ev.time && (
                                        <span className="text-sm font-normal text-sky-600 dark:text-sky-400">
                                          · {ev.time}
                                        </span>
                                      )}
                                    </div>
                                    {ev.notes && (
                                      <p className="mt-2 text-sm text-[var(--accent-soft)] whitespace-pre-wrap line-clamp-2">{ev.notes}</p>
                                    )}
                                    {ev.meetingMinutes && (
                                      <div className="mt-2 pt-2 border-t border-sky-200/50 dark:border-sky-800/50">
                                        <p className="text-xs font-medium text-sky-600 dark:text-sky-400 mb-1">Minuta</p>
                                        <p className="text-sm text-[var(--accent-soft)] whitespace-pre-wrap line-clamp-3">{ev.meetingMinutes}</p>
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => goToProjectCalendar(ev.projectId)}
                                    className="shrink-0 p-2 rounded-lg text-sky-600 dark:text-sky-400 hover:bg-sky-200/50 dark:hover:bg-sky-800/50"
                                    title={`Vai al calendario di ${ev.project.name}`}
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Resoconti */}
                      {dayData?.diaryEntries && dayData.diaryEntries.length > 0 && (
                        <div>
                          <p className="flex items-center gap-2 text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-3">
                            <FileText className="w-3.5 h-3.5" />
                            Resoconti diario
                          </p>
                          <ul className="space-y-2">
                            {dayData.diaryEntries.map((entry) => {
                              const isExpanded = expandedEntryIds.has(entry.id);
                              const preview = entry.content?.trim().slice(0, 60);
                              const nImages = entry.images?.length ?? 0;
                              const nComments = entry.comments?.length ?? 0;
                              const mediaLabel = [nImages > 0 && `${nImages} imm.`, nComments > 0 && `${nComments} comm.`].filter(Boolean).join(" · ");
                              return (
                                <li key={entry.id} className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/10 overflow-hidden">
                                  <button
                                    type="button"
                                    onClick={() => toggleEntryExpanded(entry.id)}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-colors"
                                  >
                                    <span className="shrink-0 text-amber-600 dark:text-amber-400">
                                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                    </span>
                                    <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <span
                                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium truncate max-w-[140px] ${projectBadgeClass(entry.project.name)}`}
                                          title={entry.project.name}
                                        >
                                          {entry.project.name}
                                        </span>
                                      </div>
                                      <p className="text-xs text-[var(--muted)] truncate">
                                        {preview ? `${preview}${(entry.content?.length ?? 0) > 60 ? "…" : ""}` : "Nessun testo"}
                                        {mediaLabel && ` · ${mediaLabel}`}
                                      </p>
                                    </div>
                                  </button>
                                  {isExpanded && (
                                    <div className="border-t border-amber-200 dark:border-amber-800/50 p-4 space-y-4">
                                      {entry.content?.trim() && (
                                        <p className="whitespace-pre-wrap text-[var(--accent)] text-sm">{entry.content}</p>
                                      )}
                                      {entry.images && entry.images.length > 0 && (
                                        <div className="flex flex-wrap gap-3">
                                          {entry.images.map((img) =>
                                            isImageFile(img.filename) ? (
                                              <a
                                                key={img.id}
                                                href={uploadsUrl(img.path)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block w-24 h-24 rounded-lg border border-[var(--border)] overflow-hidden"
                                              >
                                                <img src={uploadsUrl(img.path)} alt={img.filename} className="w-full h-full object-cover" />
                                              </a>
                                            ) : (
                                              <a
                                                key={img.id}
                                                href={uploadsUrl(img.path)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-hover)] px-3 py-2 text-sm text-indigo-600 dark:text-indigo-400"
                                              >
                                                <FileText className="w-4 h-4" />
                                                {img.filename}
                                              </a>
                                            )
                                          )}
                                        </div>
                                      )}
                                      {entry.comments && entry.comments.length > 0 && (
                                        <ul className="space-y-2">
                                          {entry.comments.map((c) => (
                                            <li key={c.id} className="rounded-lg bg-[var(--surface-hover)] px-3 py-2 text-sm">
                                              {c.content}
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => goToProjectCalendar(entry.projectId)}
                                        className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                                      >
                                        <ExternalLink className="w-4 h-4" />
                                        Vai al calendario di {entry.project.name}
                                      </button>
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}

                      {(!dayData || (dayData.events.length === 0 && dayData.diaryEntries.length === 0)) && !loadingContent && (
                        <div className="flex flex-col items-center justify-center py-16 text-[var(--muted)]">
                          <FileText className="w-12 h-12 mb-3 opacity-40" />
                          <p className="text-sm font-medium">Nessun resoconto né evento</p>
                          <p className="text-xs mt-1">In questo giorno non ci sono attività nei tuoi progetti.</p>
                        </div>
                      )}
                    </div>
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
                  Clicca su una data per vedere resoconti e eventi di tutti i progetti.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
