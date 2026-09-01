import type { LabelData, LabelSettings } from "../types";
import LabelSheet from "./LabelSheet";
import { IconSpark, IconExpand } from "./icons";

interface Props {
  labels: LabelData[];
  zoom: number;
  settings: LabelSettings;
  onDemo: () => void;
  onOpen: (index: number) => void;
}

export default function Workspace({ labels, zoom, settings, onDemo, onOpen }: Props) {
  if (labels.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-ink-200/60 border border-ink-200 flex items-center justify-center text-ink-400">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18M9 3v18" />
          </svg>
        </div>
        <div>
          <p className="font-display text-[15px] font-bold text-ink-700 mb-1.5">Наклеек пока нет</p>
          <p className="text-[12.5px] text-ink-400 max-w-[340px] leading-relaxed">
            Заполните «Наименование товара» в панели слева — каждая строка станет отдельной наклейкой.
            Кликните по наклейке, чтобы развернуть её на весь экран.
          </p>
        </div>
        <button
          onClick={onDemo}
          className="pop-in flex items-center gap-2 rounded-lg bg-moss-600 text-white px-4 py-2.5 text-[13px] font-bold hover:bg-moss-500 active:scale-[0.97] transition-all cursor-pointer shadow-[0_6px_18px_rgba(35,160,88,0.35)]"
        >
          <IconSpark size={15} /> Загрузить демо-данные
        </button>
      </div>
    );
  }

  const w = settings.width * zoom;
  const h = settings.height * zoom;

  return (
    <div className="p-7 flex flex-wrap gap-7 justify-start content-start">
      {labels.map((l, i) => (
        <div key={i} className="flex flex-col items-center gap-2">
          <button
            className="pop-in relative shrink-0 cursor-pointer rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-moss-500 group"
            style={{ width: w, height: h }}
            onClick={() => onOpen(i)}
            title="Развернуть на весь экран"
          >
            <div
              className="absolute top-0 left-0 z-10 pointer-events-none"
              style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
            >
              <div className="relative shadow-[0_10px_30px_rgba(10,16,12,0.22)] transition-all duration-200 group-hover:shadow-[0_18px_44px_rgba(10,16,12,0.34)] group-hover:-translate-y-1">
                <LabelSheet data={l} settings={settings} />
                {/* Подсказка раскрытия при наведении */}
                <span className="absolute inset-0 bg-ink-950/0 group-hover:bg-ink-950/12 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-200 rounded-full bg-ink-900/85 text-white p-3 shadow-xl">
                    <IconExpand size={18} />
                  </span>
                </span>
              </div>
            </div>

            <span
              className={`absolute -top-2.5 -left-2.5 z-20 pointer-events-none h-6 px-2 rounded-full flex items-center justify-center font-mono text-[10.5px] font-bold shadow-md border border-white transition-colors ${
                l.totalCopies > 1 ? "bg-sky-info text-white" : "bg-ink-900 text-lime-glow"
              }`}
            >
              {l.uniqueIndex}{l.totalCopies > 1 ? `·${l.copyIndex}` : ""}
            </span>
          </button>
        </div>
      ))}
    </div>
  );
}
