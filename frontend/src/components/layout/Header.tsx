import { useState, useCallback, useEffect } from "react";
import { Search, Moon, Sun, Menu } from "lucide-react";
import { GlobalSearch } from "../search/GlobalSearch";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    if (dark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [dark]);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  return (
    <header className="h-14 shrink-0 border-b border-[var(--border)] flex items-center px-3 md:px-6 gap-2 md:gap-4 bg-[var(--surface)]">
      <button
        type="button"
        onClick={onMenuClick}
        className="md:hidden p-2.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="Apri menu"
      >
        <Menu className="w-6 h-6" />
      </button>
      <button
        type="button"
        onClick={() => setDark((d) => !d)}
        className="p-2.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label={dark ? "Attiva tema chiaro" : "Attiva tema scuro"}
      >
        {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>
      <button
        type="button"
        onClick={openSearch}
        className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--accent)] transition-colors text-sm flex-1 min-w-0 min-h-[44px] touch-manipulation"
      >
        <Search className="w-4 h-4 shrink-0" />
        <span className="hidden sm:inline truncate">Cerca in task, diario, commenti...</span>
        <span className="sm:hidden">Cerca...</span>
      </button>
      {searchOpen && <GlobalSearch onClose={closeSearch} />}
    </header>
  );
}
