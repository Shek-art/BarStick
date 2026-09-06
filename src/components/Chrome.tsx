import type { ToastItem } from "../types";
import {
  LogoMark,
  IconMinus, IconPlus, IconCheck, IconAlert, IconInfo, IconX,
} from "./icons";

/* ── Тайтлбар ──────────────────────────────────────────────── */
export function TitleBar() {
  return (
    <div className="no-print h-11 bg-ink-900 border-b border-white/8 flex items-center pl-4 select-none shrink-0">
      <div className="flex items-center gap-2.5">
        <LogoMark size={24} />
        <span className="font-display text-[11px] font-bold tracking-[0.14em] text-paper uppercase">
          Генератор наклеек
        </span>
      </div>
    </div>
  );
}

/* ── Статусбар ──────────────────────────────────────────────── */
interface StatusBarProps {
  mode: "labels" | "checker";
  uniqueCount: number;
  totalCount: number;
  saveState: "idle" | "saving" | "saved";
  zoom: number;
  onZoom: (z: number) => void;
  labelSize?: string;
  checker?: { lists: number; lines: number; passed: boolean | null };
}

const ZOOM_STEPS = [0.4, 0.55, 0.7, 0.85, 1];

export function StatusBar({ mode, uniqueCount, totalCount, saveState, zoom, onZoom, labelSize, checker }: StatusBarProps) {
  const zi = ZOOM_STEPS.indexOf(zoom);
  return (
    <div className="no-print h-9 bg-ink-900 border-t border-white/8 flex items-center justify-between px-3.5 text-[11px] shrink-0 select-none">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              saveState === "saving" ? "bg-amber-warn pulse-dot" : saveState === "saved" ? "bg-lime-glow pulse-dot" : "bg-ink-500"
            }`}
          />
          <span className={`font-semibold transition-colors ${saveState === "idle" ? "text-ink-300" : "text-ink-200"}`}>
            {saveState === "saving" ? "Сохранение…" : saveState === "saved" ? "Всё сохранено" : "Локальная сессия"}
          </span>
        </span>
        {labelSize && mode === "labels" && (
          <span className="hidden md:block font-mono text-[10px] font-bold text-ink-300 bg-white/6 rounded px-1.5 py-0.5">
            {labelSize}
          </span>
        )}
      </div>

      {mode === "labels" ? (
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10.5px] font-bold text-ink-200 bg-white/6 rounded-md px-2 py-0.5">
            позиций <span className="text-lime-glow">{uniqueCount}</span>
          </span>
          <span className="font-mono text-[10.5px] font-bold text-ink-200 bg-white/6 rounded-md px-2 py-0.5">
            наклеек <span className="text-lime-glow">{totalCount}</span>
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10.5px] font-bold text-ink-200 bg-white/6 rounded-md px-2 py-0.5">
            списков <span className="text-lime-glow">{checker?.lists ?? 0}</span>
          </span>
          <span className="font-mono text-[10.5px] font-bold text-ink-200 bg-white/6 rounded-md px-2 py-0.5">
            строк <span className="text-lime-glow">{checker?.lines ?? 0}</span>
          </span>
          {checker?.passed !== null && checker?.passed !== undefined && (
            <span className={`font-mono text-[10px] font-bold rounded-md px-2 py-0.5 ${
              checker.passed ? "bg-lime-glow/15 text-lime-glow" : "bg-rust/20 text-rust"
            }`}>
              {checker.passed ? "✓ проверки пройдены" : "✗ есть проблемы"}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        {mode === "labels" && (
          <span className="hidden lg:block text-ink-500 font-mono text-[10px]">Ctrl+Enter — печать</span>
        )}
        {mode === "checker" && (
          <span className="hidden lg:block text-ink-500 font-mono text-[10px]">TXT / CSV · до 3 списков</span>
        )}
        {mode === "labels" && (
          <div className="flex items-center rounded-lg border border-white/10 overflow-hidden">
            <button
              className="w-7 h-6 flex items-center justify-center text-ink-300 hover:bg-white/10 hover:text-paper transition-colors disabled:opacity-30 cursor-pointer"
              disabled={zi <= 0}
              onClick={() => onZoom(ZOOM_STEPS[Math.max(0, zi - 1)])}
              title="Уменьшить"
            >
              <IconMinus size={12} />
            </button>
            <span className="w-12 text-center font-mono text-[10.5px] font-bold text-paper border-x border-white/10 leading-6">
              {Math.round(zoom * 100)}%
            </span>
            <button
              className="w-7 h-6 flex items-center justify-center text-ink-300 hover:bg-white/10 hover:text-paper transition-colors disabled:opacity-30 cursor-pointer"
              disabled={zi >= ZOOM_STEPS.length - 1}
              onClick={() => onZoom(ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, zi + 1)])}
              title="Увеличить"
            >
              <IconPlus size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Тосты ──────────────────────────────────────────────────── */
const TOAST_STYLE = {
  success: { border: "border-moss-500/50", icon: <IconCheck size={14} />, tint: "text-lime-glow", bg: "bg-moss-500/12" },
  error: { border: "border-rust/50", icon: <IconAlert size={14} />, tint: "text-rust", bg: "bg-rust/12" },
  info: { border: "border-sky-info/50", icon: <IconInfo size={14} />, tint: "text-sky-info", bg: "bg-sky-info/12" },
} as const;

export function Toasts({ items, onDismiss }: { items: ToastItem[]; onDismiss: (id: number) => void }) {
  return (
    <div className="no-print fixed top-13 right-3 z-[95] flex flex-col gap-2 w-[300px] pointer-events-none">
      {items.map((t) => {
        const s = TOAST_STYLE[t.kind];
        return (
          <div
            key={t.id}
            className={`toast-in pointer-events-auto flex items-start gap-2.5 bg-ink-800 border ${s.border} rounded-xl px-3 py-2.5 shadow-2xl shadow-ink-950/40`}
          >
            <span className={`mt-px ${s.tint} ${s.bg} rounded-md p-1`}>{s.icon}</span>
            <p className="flex-1 text-[12px] leading-snug font-medium text-paper">{t.text}</p>
            <button onClick={() => onDismiss(t.id)} className="text-ink-300 hover:text-paper transition-colors cursor-pointer mt-px">
              <IconX size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
