import { useCallback, useEffect, useState } from "react";
import type { LabelData, LabelSettings } from "../types";
import { labelPx } from "../lib/settings";
import LabelSheet from "./LabelSheet";
import { IconX, IconChevronLeft, IconChevronRight, IconMinus, IconPlus, IconFit } from "./icons";

interface Props {
  labels: LabelData[];
  index: number;
  settings: LabelSettings;
  onClose: () => void;
  onNav: (i: number) => void;
}

/** Полноэкранный просмотр наклейки по клику */
export default function Lightbox({ labels, index, settings, onClose, onNav }: Props) {
  const [scale, setScale] = useState(0.8);
  const [isFit, setIsFit] = useState(true);
  const label = labels[index];
  const px = labelPx(settings);

  const fit = useCallback(() => {
    const vw = window.innerWidth - 150;
    const vh = window.innerHeight - 170;
    setScale(Math.min(vw / px.w, vh / px.h, 1.15));
    setIsFit(true);
  }, [px.w, px.h]);

  useEffect(() => {
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [fit, index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && index > 0) onNav(index - 1);
      else if (e.key === "ArrowRight" && index < labels.length - 1) onNav(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onNav, index, labels.length]);

  if (!label) return null;

  const zoomBy = (d: number) => {
    setScale((s) => Math.min(2.2, Math.max(0.15, +(s + d).toFixed(2))));
    setIsFit(false);
  };

  return (
    <div className="no-print fixed inset-0 z-[80] bg-ink-950/96 flex flex-col">
      {/* Верхняя панель */}
      <div className="shrink-0 h-13 border-b border-white/10 flex items-center justify-between px-4 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-display text-[12px] font-bold text-paper tracking-wide uppercase">Просмотр</span>
          <span className="font-mono text-[11px] font-bold text-lime-glow bg-lime-glow/12 border border-lime-glow/25 rounded-md px-2 py-0.5 tabular-nums">
            {index + 1} / {labels.length}
          </span>
          {label.code && (
            <span className="hidden sm:block font-mono text-[11px] text-ink-300 truncate">{label.code}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-white/12 overflow-hidden">
            <button className="w-8 h-7 flex items-center justify-center text-ink-300 hover:bg-white/10 hover:text-paper transition-colors cursor-pointer" onClick={() => zoomBy(-0.15)} title="Уменьшить">
              <IconMinus size={13} />
            </button>
            <span className="w-14 text-center font-mono text-[11px] font-bold text-paper border-x border-white/12 leading-7 tabular-nums">
              {Math.round(scale * 100)}%
            </span>
            <button className="w-8 h-7 flex items-center justify-center text-ink-300 hover:bg-white/10 hover:text-paper transition-colors cursor-pointer" onClick={() => zoomBy(0.15)} title="Увеличить">
              <IconPlus size={13} />
            </button>
            <button
              className={`w-8 h-7 flex items-center justify-center border-l border-white/12 transition-colors cursor-pointer ${isFit ? "text-lime-glow bg-lime-glow/10" : "text-ink-300 hover:bg-white/10 hover:text-paper"}`}
              onClick={fit}
              title="Вписать в окно"
            >
              <IconFit size={13} />
            </button>
          </div>
          <button
            className="h-8 px-3 rounded-lg border border-white/12 text-ink-200 hover:bg-rust hover:border-rust hover:text-white transition-colors text-[12px] font-bold cursor-pointer flex items-center gap-1.5"
            onClick={onClose}
            title="Esc"
          >
            <IconX size={13} /> Закрыть
          </button>
        </div>
      </div>

      {/* Область просмотра */}
      <div className="flex-1 relative overflow-auto nice-scroll flex items-center justify-center p-8">
        {index > 0 && (
          <button
            className="sticky left-3 z-10 shrink-0 w-11 h-11 rounded-full bg-white/8 border border-white/15 text-paper flex items-center justify-center hover:bg-moss-500 hover:border-moss-500 transition-all cursor-pointer"
            onClick={() => onNav(index - 1)}
            title="Предыдущая (←)"
          >
            <IconChevronLeft size={20} />
          </button>
        )}

        <div key={index} className="pop-in shrink-0" style={{ width: px.w * scale, height: px.h * scale }}>
          <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: px.w, height: px.h }}>
            <div className="shadow-[0_30px_90px_rgba(0,0,0,0.65)]">
              <LabelSheet data={label} settings={settings} />
            </div>
          </div>
        </div>

        {index < labels.length - 1 && (
          <button
            className="sticky right-3 z-10 shrink-0 w-11 h-11 rounded-full bg-white/8 border border-white/15 text-paper flex items-center justify-center hover:bg-moss-500 hover:border-moss-500 transition-all cursor-pointer"
            onClick={() => onNav(index + 1)}
            title="Следующая (→)"
          >
            <IconChevronRight size={20} />
          </button>
        )}
      </div>

      {/* Нижняя подсказка */}
      <div className="shrink-0 h-8 border-t border-white/8 flex items-center justify-center gap-4 text-[10.5px] font-mono text-ink-500">
        <span>← → листать</span>
        <span>Esc — закрыть</span>
        <span>{settings.widthMm} × {settings.heightMm} мм</span>
      </div>
    </div>
  );
}
