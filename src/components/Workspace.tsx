import type { LabelData } from "../types";
import LabelSheet from "./LabelSheet";
import { LABEL_W, LABEL_H } from "../lib/exporters";
import { IconSpark } from "./icons";

interface Props {
  labels: LabelData[];
  zoom: number;
  onDemo: () => void;
}

function EmptyState({ onDemo }: { onDemo: () => void }) {
  return (
    <div className="h-full flex items-center justify-center p-10">
      <div className="flex flex-col lg:flex-row items-center gap-12 max-w-3xl">
        {/* Призрак наклейки */}
        <div className="relative shrink-0 rise-in">
          <div
            className="border-[2.5px] border-dashed border-ink-300/70 rounded-sm bg-white/60 backdrop-blur-[1px] p-3 rotate-[-3deg] shadow-[0_18px_40px_rgba(20,29,23,0.12)] transition-transform duration-500 hover:rotate-0"
            style={{ width: 210, height: 357 }}
          >
            <div className="h-6 border-2 border-ink-200/70 bg-moss-500/10 mb-1.5" />
            <div className="h-8 border-2 border-ink-200/70 mb-1.5 p-1">
              <div className="h-1.5 w-4/5 bg-ink-200/70 rounded mb-1" />
              <div className="h-1.5 w-3/5 bg-ink-200/50 rounded" />
            </div>
            <div className="h-4 border-2 border-ink-200/70 mb-1.5" />
            <div className="h-4 border-2 border-ink-200/70 mb-1.5" />
            <div className="h-5 border-2 border-ink-200/70 mb-1.5" />
            <div className="h-12 border-2 border-ink-200/70 mb-1.5 flex items-end justify-center gap-[3px] p-1">
              {[3, 1, 4, 2, 5, 1, 3, 2, 4, 1, 2, 3].map((w, i) => (
                <div key={i} className="bg-ink-300/60 h-full" style={{ width: w }} />
              ))}
            </div>
            <div className="flex-1 h-20 border-2 border-dashed border-ink-200/70 flex items-center justify-center">
              <span className="text-[9px] text-ink-300 font-semibold uppercase tracking-widest">фото</span>
            </div>
          </div>
          <span className="absolute -top-3 -left-3 w-9 h-9 rounded-full bg-moss-600 text-white flex items-center justify-center shadow-lg blink-soft">
            <IconSpark size={16} />
          </span>
        </div>

        {/* Инструкция */}
        <div className="rise-in" style={{ animationDelay: "90ms" }}>
          <p className="font-display text-[11px] font-bold uppercase tracking-[0.25em] text-moss-600 mb-2">
            Предпросмотр пуст
          </p>
          <h2 className="font-display text-2xl xl:text-[27px] font-bold leading-tight text-ink-800 mb-4">
            Наклейки соберутся здесь,<br />как только заполните поля
          </h2>
          <ol className="flex flex-col gap-2.5 mb-5">
            {[
              "Каждая строка в полях слева — отдельная наклейка",
              "«Тираж» напечатает нужное число копий позиции",
              "EAN-13 нарисуется сам из 12–13 цифр",
            ].map((t, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="font-mono text-[11px] font-extrabold w-6 h-6 rounded-md bg-ink-800 text-lime-glow flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="text-[13.5px] text-ink-600 font-medium">{t}</span>
              </li>
            ))}
          </ol>
          <button
            onClick={onDemo}
            className="tb-btn tb-primary !px-5 !py-2.5 !text-[13px] cursor-pointer"
          >
            <IconSpark size={15} />
            Загрузить демо-данные
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Workspace({ labels, zoom, onDemo }: Props) {
  if (labels.length === 0) return <EmptyState onDemo={onDemo} />;

  return (
    <div className="flex flex-wrap content-start justify-center gap-7 p-8">
      {labels.map((l, i) => (
        <div
          key={`${l.uniqueIndex}-${l.copyIndex}-${i}`}
          className="relative shrink-0 rise-in group transition-transform duration-200 hover:-translate-y-1.5"
          style={{ width: LABEL_W * zoom, height: LABEL_H * zoom, animationDelay: `${Math.min(i, 10) * 45}ms` }}
        >
          {/* Номер позиции */}
          <span className="absolute -top-3 -left-3 z-10 h-7 min-w-7 px-2 rounded-full bg-ink-900 text-lime-glow font-mono text-[12px] font-extrabold flex items-center justify-center shadow-md border-2 border-canvas transition-transform duration-200 group-hover:scale-110">
            {i + 1}
          </span>
          {/* Копия */}
          {l.totalCopies > 1 && (
            <span className="absolute -top-3 -right-2 z-10 h-6 px-2 rounded-full bg-amber-warn text-ink-900 font-mono text-[10.5px] font-extrabold flex items-center justify-center shadow-md pop-in">
              копия {l.copyIndex}/{l.totalCopies}
            </span>
          )}
          <div
            className="absolute top-0 left-0 origin-top-left shadow-[0_14px_34px_rgba(20,29,23,0.22)] transition-shadow duration-200 group-hover:shadow-[0_22px_48px_rgba(20,29,23,0.3)]"
            style={{ transform: `scale(${zoom})` }}
          >
            <LabelSheet data={l} />
          </div>
        </div>
      ))}
    </div>
  );
}
