import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { DayPicker } from "react-day-picker";
import { apiGet, apiPost, apiPatch, apiDelete, apiUpload, uploadsUrl } from "@/api/client";
import type { DiaryEntry, ProjectEvent } from "@/types";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarDays, FileText, MessageCircle, Plus, Video, Users, Calendar, X, ImagePlus, Send, Trash2 } from "lucide-react";

const EVENT_TYPES = [
  { value: "call", label: "Call", icon: Video },
  { value: "meeting", label: "Meeting", icon: Users },
  { value: "other", label: "Altro", icon: Calendar },
];

interface DiaryEntryCardProps {
  entry: DiaryEntry;
  onUpdateContent: (content: string) => void;
  onAddImage: (file: File) => void;
  onRemoveImage: (imageId: string) => void;
  onAddComment: (content: string, clearInput: () => void) => void;
  onDelete: () => void;
}

function DiaryEntryCard({
  entry,
  onUpdateContent,
  onAddImage,
  onRemoveImage,
  onAddComment,
  onDelete,
}: DiaryEntryCardProps) {
  const [content, setContent] = useState(entry.content ?? "");
  const [comment, setComment] = useState("");

  const handleBlur = () => {
    if (content !== (entry.content ?? "")) {
      onUpdateContent(content);
    }
  };

  return (
    <article className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
        <time className="font-medium text-[var(--accent)]">
          {format(new Date(entry.date), "EEEE d MMMM yyyy", { locale: it })}
        </time>
        <button
          type="button"
          onClick={onDelete}
          className="p-2 rounded-lg text-[var(--muted)] hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
          aria-label="Elimina"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 space-y-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={handleBlur}
          placeholder="Scrivi il resoconto..."
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent text-[var(--accent)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ImagePlus className="w-4 h-4 text-[var(--muted)]" />
            <span className="text-sm font-medium text-[var(--accent)]">Immagini</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {entry.images?.map((img) => (
              <div key={img.id} className="relative group">
                <img
                  src={uploadsUrl(img.path)}
                  alt={img.filename}
                  className="w-24 h-24 object-cover rounded-lg border border-[var(--border)]"
                />
                <button
                  type="button"
                  onClick={() => onRemoveImage(img.id)}
                  className="absolute top-1 right-1 p-1 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            <label className="flex items-center justify-center w-24 h-24 rounded-lg border-2 border-dashed border-[var(--border)] cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--muted)]">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onAddImage(f);
                  e.target.value = "";
                }}
              />
              <ImagePlus className="w-8 h-8" />
            </label>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="w-4 h-4 text-[var(--muted)]" />
            <span className="text-sm font-medium text-[var(--accent)]">Commenti</span>
          </div>
          <ul className="space-y-2 mb-3">
            {entry.comments?.map((c) => (
              <li key={c.id} className="rounded-lg bg-[var(--surface-hover)] px-3 py-2 text-sm">
                {c.content}
              </li>
            ))}
          </ul>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onAddComment(comment, () => setComment(""));
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Aggiungi commento..."
              className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent text-[var(--accent)] placeholder:text-[var(--muted)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={!comment.trim()}
              className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </article>
  );
}

export function ProjectCalendar() {
  const { projectId } = useParams<{ projectId: string }>();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [daysWithEntries, setDaysWithEntries] = useState<string[]>([]);
  const [daysWithEvents, setDaysWithEvents] = useState<string[]>([]);
  const [entriesForDay, setEntriesForDay] = useState<DiaryEntry[]>([]);
  const [eventsForDay, setEventsForDay] = useState<ProjectEvent[]>([]);
  const [loadingDays, setLoadingDays] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  const [showAddChoice, setShowAddChoice] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [eventError, setEventError] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState({ date: "", time: "", type: "meeting" as string, name: "", notes: "" });
  const [showDiaryForm, setShowDiaryForm] = useState(false);
  const [diaryForm, setDiaryForm] = useState({ date: "", content: "" });
  const [savingDiary, setSavingDiary] = useState(false);
  const [diaryError, setDiaryError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    setLoadingDays(true);
    Promise.all([
      apiGet<{ dates: string[] }>(
        `/projects/${projectId}/diary/calendar-days?year=${currentMonth.getFullYear()}&month=${currentMonth.getMonth() + 1}`
      ),
      apiGet<{ dates: string[] }>(
        `/projects/${projectId}/events/calendar-days?year=${currentMonth.getFullYear()}&month=${currentMonth.getMonth() + 1}`
      ),
    ])
      .then(([diary, events]) => {
        setDaysWithEntries(diary.dates);
        setDaysWithEvents(events.dates);
      })
      .catch(console.error)
      .finally(() => setLoadingDays(false));
  }, [projectId, currentMonth.getFullYear(), currentMonth.getMonth()]);

  useEffect(() => {
    if (!projectId || !selectedDate) {
      setEntriesForDay([]);
      setEventsForDay([]);
      return;
    }
    setLoadingContent(true);
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    Promise.all([
      apiGet<DiaryEntry[]>(`/projects/${projectId}/diary/by-date?date=${dateStr}`),
      apiGet<ProjectEvent[]>(`/projects/${projectId}/events/by-date?date=${dateStr}`),
    ])
      .then(([entries, events]) => {
        setEntriesForDay(entries);
        setEventsForDay(events);
      })
      .catch(console.error)
      .finally(() => setLoadingContent(false));
  }, [projectId, selectedDate?.toISOString()]);

  const hasEntry = (date: Date) => daysWithEntries.includes(format(date, "yyyy-MM-dd"));
  const hasEvent = (date: Date) => daysWithEvents.includes(format(date, "yyyy-MM-dd"));

  const refetchContentForDay = async () => {
    if (!projectId || !selectedDate) return;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    try {
      const [entries, events] = await Promise.all([
        apiGet<DiaryEntry[]>(`/projects/${projectId}/diary/by-date?date=${dateStr}`),
        apiGet<ProjectEvent[]>(`/projects/${projectId}/events/by-date?date=${dateStr}`),
      ]);
      setEntriesForDay(entries);
      setEventsForDay(events);
    } catch (e) {
      console.error(e);
    }
  };

  const refetchCalendarDays = async () => {
    if (!projectId) return;
    try {
      const [diary, events] = await Promise.all([
        apiGet<{ dates: string[] }>(`/projects/${projectId}/diary/calendar-days?year=${currentMonth.getFullYear()}&month=${currentMonth.getMonth() + 1}`),
        apiGet<{ dates: string[] }>(`/projects/${projectId}/events/calendar-days?year=${currentMonth.getFullYear()}&month=${currentMonth.getMonth() + 1}`),
      ]);
      setDaysWithEntries(diary.dates);
      setDaysWithEvents(events.dates);
    } catch (e) {
      console.error(e);
    }
  };

  const openAddChoice = () => {
    const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
    setShowAddChoice(true);
    setEventForm((f) => ({ ...f, date: dateStr }));
    setDiaryForm({ date: dateStr, content: "" });
  };

  const openEventForm = () => {
    setShowAddChoice(false);
    setEventError(null);
    setEventForm((f) => ({
      ...f,
      date: selectedDate ? format(selectedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      time: "",
      type: "meeting",
      name: "",
      notes: "",
    }));
    setShowEventForm(true);
  };

  const openDiaryForm = () => {
    setShowAddChoice(false);
    setDiaryError(null);
    setDiaryForm({
      date: selectedDate ? format(selectedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      content: "",
    });
    setShowDiaryForm(true);
  };

  const submitDiaryEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setDiaryError(null);
    if (!projectId || savingDiary) return;
    const date = diaryForm.date.trim();
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setDiaryError("Inserisci una data valida.");
      return;
    }
    setSavingDiary(true);
    try {
      await apiPost(`/projects/${projectId}/diary`, { date, content: diaryForm.content.trim() || undefined });
      setShowDiaryForm(false);
      await refetchContentForDay();
      await refetchCalendarDays();
    } catch (err) {
      setDiaryError(err instanceof Error ? err.message : "Impossibile salvare il resoconto.");
    } finally {
      setSavingDiary(false);
    }
  };

  const updateDiaryContent = async (entry: DiaryEntry, content: string) => {
    if (!projectId) return;
    try {
      await apiPatch(`/projects/${projectId}/diary/${entry.id}`, { content: content || undefined });
      await refetchContentForDay();
    } catch (e) {
      console.error(e);
    }
  };

  const addDiaryImage = async (entryId: string, file: File) => {
    if (!projectId) return;
    try {
      await apiUpload(`/projects/${projectId}/diary/${entryId}/images`, file);
      await refetchContentForDay();
    } catch (e) {
      console.error(e);
    }
  };

  const removeDiaryImage = async (entryId: string, imageId: string) => {
    if (!projectId) return;
    try {
      await apiDelete(`/projects/${projectId}/diary/${entryId}/images/${imageId}`);
      await refetchContentForDay();
    } catch (e) {
      console.error(e);
    }
  };

  const addDiaryComment = async (entryId: string, content: string, clearInput: () => void) => {
    if (!projectId || !content.trim()) return;
    try {
      await apiPost(`/projects/${projectId}/diary/${entryId}/comments`, { content: content.trim() });
      clearInput();
      await refetchContentForDay();
    } catch (e) {
      console.error(e);
    }
  };

  const deleteDiaryEntry = async (entryId: string) => {
    if (!projectId || !confirm("Eliminare questo resoconto?")) return;
    try {
      await apiDelete(`/projects/${projectId}/diary/${entryId}`);
      await refetchContentForDay();
      await refetchCalendarDays();
    } catch (e) {
      console.error(e);
    }
  };

  const submitEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setEventError(null);
    if (!projectId || savingEvent) return;
    const name = eventForm.name.trim();
    const date = eventForm.date.trim();
    if (!name) return;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setEventError("Inserisci una data valida (es. giorno nel calendario o campo Data).");
      return;
    }
    setSavingEvent(true);
    try {
      await apiPost(`/projects/${projectId}/events`, {
        date,
        time: eventForm.time.trim() || undefined,
        type: eventForm.type,
        name,
        notes: eventForm.notes.trim() || undefined,
      });
      setShowEventForm(false);
      if (selectedDate && date === format(selectedDate, "yyyy-MM-dd")) {
        const events = await apiGet<ProjectEvent[]>(`/projects/${projectId}/events/by-date?date=${date}`);
        setEventsForDay(events);
      }
      setDaysWithEvents((prev) => (prev.includes(date) ? prev : [...prev, date].sort()));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossibile salvare l'evento. Riprova.";
      setEventError(message);
    } finally {
      setSavingEvent(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
          <CalendarDays className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-[var(--accent)]">Calendario</h2>
          <p className="text-sm text-[var(--muted)]">Resoconti e eventi (call, meeting)</p>
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
                  <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
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
                  hasEntry: (date) => hasEntry(date),
                  hasEvent: (date) => hasEvent(date),
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
                <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--surface-hover)]/50 flex items-center justify-between flex-wrap gap-2">
                  <h3 className="font-semibold text-[var(--accent)]">
                    {format(selectedDate, "EEEE d MMMM yyyy", { locale: it })}
                  </h3>
                  <button
                    type="button"
                    onClick={openAddChoice}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Aggiungi
                  </button>
                </div>
                <div className="p-6">
                  {loadingContent ? (
                    <div className="flex flex-col items-center justify-center py-16 text-[var(--muted)]">
                      <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
                      <p className="text-sm">Caricamento...</p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {/* Eventi (blu/sky) */}
                      {eventsForDay.length > 0 && (
                        <div>
                          <p className="flex items-center gap-2 text-xs font-medium text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-3">
                            <Calendar className="w-3.5 h-3.5" />
                            Eventi
                          </p>
                          <ul className="space-y-3">
                            {eventsForDay.map((ev) => (
                              <li
                                key={ev.id}
                                className="rounded-xl border border-sky-200 dark:border-sky-800/50 bg-sky-50/60 dark:bg-sky-900/20 p-4"
                              >
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
                                  <p className="mt-2 text-sm text-[var(--accent-soft)] whitespace-pre-wrap">{ev.notes}</p>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Resoconti (card editabili: testo, immagini, commenti) */}
                      {entriesForDay.length > 0 && (
                        <div>
                          <p className="flex items-center gap-2 text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-3">
                            <FileText className="w-3.5 h-3.5" />
                            Resoconti diario
                          </p>
                          <ul className="space-y-5">
                            {entriesForDay.map((entry) => (
                              <li key={entry.id}>
                                <DiaryEntryCard
                                  entry={entry}
                                  onUpdateContent={(content) => updateDiaryContent(entry, content)}
                                  onAddImage={(file) => addDiaryImage(entry.id, file)}
                                  onRemoveImage={(imageId) => removeDiaryImage(entry.id, imageId)}
                                  onAddComment={(content, clear) => addDiaryComment(entry.id, content, clear)}
                                  onDelete={() => deleteDiaryEntry(entry.id)}
                                />
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {eventsForDay.length === 0 && entriesForDay.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-[var(--muted)]">
                          <FileText className="w-12 h-12 mb-3 opacity-40" />
                          <p className="text-sm font-medium">Nessun resoconto né evento</p>
                          <p className="text-xs mt-1">Clicca &quot;Aggiungi&quot; per inserire un evento o un resoconto.</p>
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
                  Clicca su una data per vedere resoconti e eventi.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal scelta: Evento o Resoconto */}
      {showAddChoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowAddChoice(false)}>
          <div
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[var(--accent)]">Aggiungi</h3>
              <button type="button" onClick={() => setShowAddChoice(false)} className="p-2 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-[var(--muted)] mb-4">Cosa vuoi aggiungere per questo giorno?</p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={openEventForm}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50/80 dark:bg-sky-900/20 hover:bg-sky-100 dark:hover:bg-sky-900/30 text-left transition-colors"
              >
                <div className="p-2 rounded-lg bg-sky-500/20 text-sky-600 dark:text-sky-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-[var(--accent)]">Evento</p>
                  <p className="text-xs text-[var(--muted)]">Call, meeting, altro</p>
                </div>
              </button>
              <button
                type="button"
                onClick={openDiaryForm}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-left transition-colors"
              >
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-[var(--accent)]">Resoconto</p>
                  <p className="text-xs text-[var(--muted)]">Testo, immagini, commenti</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal form resoconto */}
      {showDiaryForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowDiaryForm(false)}>
          <div
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[var(--accent)]">Nuovo resoconto</h3>
              <button type="button" onClick={() => setShowDiaryForm(false)} className="p-2 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={submitDiaryEntry} className="space-y-4">
              {diaryError && (
                <div className="rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm px-3 py-2">
                  {diaryError}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">Data</label>
                <input
                  type="date"
                  value={diaryForm.date}
                  onChange={(e) => setDiaryForm((f) => ({ ...f, date: e.target.value }))}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">Testo (opzionale)</label>
                <textarea
                  value={diaryForm.content}
                  onChange={(e) => setDiaryForm((f) => ({ ...f, content: e.target.value }))}
                  placeholder="Cosa è successo in questo giorno?"
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--accent)] placeholder:text-[var(--muted)] resize-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={savingDiary}
                  className="flex-1 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium disabled:opacity-50"
                >
                  {savingDiary ? "Salvataggio..." : "Salva"}
                </button>
                <button type="button" onClick={() => setShowDiaryForm(false)} className="px-4 py-2 rounded-lg bg-[var(--surface-hover)] text-[var(--accent)]">
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal aggiungi evento */}
      {showEventForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowEventForm(false)}>
          <div
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[var(--accent)]">Nuovo evento</h3>
              <button type="button" onClick={() => setShowEventForm(false)} className="p-2 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={submitEvent} className="space-y-4">
              {eventError && (
                <div className="rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm px-3 py-2">
                  {eventError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-1">Data</label>
                  <input
                    type="date"
                    value={eventForm.date}
                    onChange={(e) => setEventForm((f) => ({ ...f, date: e.target.value }))}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-1">Ora (opzionale)</label>
                  <input
                    type="time"
                    value={eventForm.time}
                    onChange={(e) => setEventForm((f) => ({ ...f, time: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--accent)]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">Tipo</label>
                <select
                  value={eventForm.type}
                  onChange={(e) => setEventForm((f) => ({ ...f, type: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--accent)]"
                >
                  {EVENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">Nome *</label>
                <input
                  type="text"
                  value={eventForm.name}
                  onChange={(e) => setEventForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="es. Call con cliente"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">Note (opzionale)</label>
                <textarea
                  value={eventForm.notes}
                  onChange={(e) => setEventForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  placeholder="Note sull'evento"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--accent)] resize-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={savingEvent || !eventForm.name.trim()}
                  className="flex-1 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium disabled:opacity-50"
                >
                  {savingEvent ? "Salvataggio..." : "Salva"}
                </button>
                <button type="button" onClick={() => setShowEventForm(false)} className="px-4 py-2 rounded-lg bg-[var(--surface-hover)] text-[var(--accent)]">
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
