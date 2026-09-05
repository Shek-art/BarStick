import { useEffect, useMemo, useRef, useState } from "react";
import type { ListInput, CheckReport } from "../lib/listCheck";
import { runChecks, countNonEmpty } from "../lib/listCheck";
import TextEditorModal from "./TextEditorModal";
import {
  IconPlus, IconX, IconCheck, IconAlert, IconInfo, IconSpark,
  IconTrash, IconUpload, IconClipboardCheck, IconFileText, IconEditor,
} from "./icons";

interface Props {
  onToast: (text: string, kind?: "success" | "error" | "info") => void;
  onStats: (s: { lists: number; lines: number; passed: boolean | null }) => void;
}

const LETTERS = ["А", "Б", "В"];
const ACCENT = [
  { badge: "bg-moss-600 text-white", chip: "bg-moss-500/12 text-moss-700 border-moss-500/30", drag: "border-moss-500 bg-moss-500/10" },
  { badge: "bg-sky-info text-white", chip: "bg-sky-info/12 text-sky-info border-sky-info/30", drag: "border-sky-info bg-sky-info/10" },
  { badge: "bg-amber-warn text-ink-900", chip: "bg-amber-warn/15 text-ink-700 border-amber-warn/40", drag: "border-amber-warn bg-amber-warn/10" },
];

const DEMO: { name: string; raw: string }[] = [
  {
    name: "Заказ поставщику",
    raw: "1_ Петля накладная GTV 35 мм\n2_ Ручка-скоба Boyard 128 мм\n3_ Стяжка мебельная 40 мм\n4_ Уголок крепёжный 40×40\n5_ Заглушка ПВХ 15 мм\n5_ Заглушка ПВХ 15 мм\n6_ Доводчик накладной",
  },
  {
    name: "Приход на склад",
    raw: "1_ Петля накладная GTV 35 мм\n2_ Ручка-скоба Boyard 128 мм\n3_ Стяжка мебельная 40 мм\n4_ Уголок крепёжный 40×40\n5_ Заглушка ПВХ 15 мм\n7_ Доводчик накладной",
  },
  {
    name: "Отгрузочная накладная",
    raw: "1_ Петля накладная GTV 35 мм\n2_ Ручка-скоба Boyard 128 мм\n3_ Стяжка мебельная 40 мм\n4_ Уголок крепёжный 40×40\n5_ Заглушка ПВХ 15 мм\n6_ Доводчик накладной",
  },
];

function uid(): string {
  return `l_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export default function ListChecker({ onToast, onStats }: Props) {
  const [lists, setLists] = useState<ListInput[]>(() =>
    LETTERS.slice(0, 2).map((L) => ({ id: uid(), name: `Список ${L}`, raw: "" }))
  );
  const [report, setReport] = useState<CheckReport | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const liveCounts = useMemo(() => lists.map((l) => countNonEmpty(l.raw)), [lists]);
  const totalLines = liveCounts.reduce((a, b) => a + b, 0);
  const filled = liveCounts.filter((c) => c > 0).length;

  /* Отчёт устаревает при любом изменении списков */
  useEffect(() => {
    setReport(null);
  }, [lists]);

  useEffect(() => {
    onStats({ lists: filled, lines: totalLines, passed: report ? report.errors + report.warns === 0 : null });
  }, [filled, totalLines, report, onStats]);

  const patch = (id: string, p: Partial<ListInput>) =>
    setLists((prev) => prev.map((l) => (l.id === id ? { ...l, ...p } : l)));

  const readFile = async (id: string, file: File) => {
    try {
      const text = await file.text();
      patch(id, { raw: text.replace(/\r\n/g, "\n"), name: file.name.replace(/\.[^.]+$/, "") });
      onToast(`Файл «${file.name}» загружен`, "success");
    } catch {
      onToast("Не удалось прочитать файл", "error");
    }
  };

  const run = () => {
    const r = runChecks(lists);
    setReport(r);
    const total = r.errors + r.warns;
    if (total === 0) onToast("Все проверки пройдены — списки согласованы", "success");
    else onToast(`Найдено проблем: ${total} — подробности в отчёте`, r.errors > 0 ? "error" : "info");
  };

  const loadDemo = () => {
    setLists(DEMO.map((d) => ({ id: uid(), ...d })));
    onToast("Демо-списки загружены — нажмите «Проверить»", "info");
  };

  const editingList = lists.find((l) => l.id === editingId) ?? null;
  const passed = report !== null && report.errors + report.warns === 0;

  return (
    <div className="max-w-[1180px] mx-auto p-6 xl:p-8 flex flex-col gap-6">
      {/* Шапка модуля */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3.5">
          <span className="mt-0.5 shrink-0 w-11 h-11 rounded-xl bg-moss-600/14 border border-moss-500/30 text-moss-600 flex items-center justify-center">
            <IconClipboardCheck size={22} />
          </span>
          <div>
            <h1 className="font-display text-[17px] font-bold text-ink-900 leading-tight">Проверка списков</h1>
            <p className="text-[12.5px] text-ink-500 mt-1 max-w-[560px] leading-relaxed">
              Загрузите 2–3 списка (TXT/CSV или вставьте текст). Модуль сверит количество строк,
              первые номера позиций <span className="font-mono font-bold text-ink-700">«1_», «2_», …</span> и найдёт дубликаты.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button className="tb-btn-light cursor-pointer" onClick={loadDemo} title="Загрузить примеры списков">
            <IconSpark size={14} /> Пример
          </button>
          <button
            className="tb-btn-light cursor-pointer"
            disabled={lists.length >= 3}
            onClick={() => {
              const L = LETTERS[lists.length];
              setLists((prev) => [...prev, { id: uid(), name: `Список ${L}`, raw: "" }]);
            }}
            title="Максимум 3 списка"
          >
            <IconPlus size={14} /> Список
          </button>
          <button
            className="tb-btn-light cursor-pointer"
            onClick={() => {
              setLists((prev) => prev.map((l) => ({ ...l, raw: "" })));
              onToast("Списки очищены", "info");
            }}
          >
            <IconTrash size={14} /> Очистить
          </button>
          <button
            className="flex items-center gap-2 rounded-lg bg-moss-600 text-white px-4 py-2.5 text-[13px] font-bold hover:bg-moss-500 active:scale-[0.97] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_6px_18px_rgba(35,160,88,0.3)]"
            onClick={run}
            disabled={filled < 2}
            title={filled < 2 ? "Заполните минимум 2 списка" : "Запустить проверку"}
          >
            <IconCheck size={15} /> Проверить
          </button>
        </div>
      </div>

      {/* Карточки списков */}
      <div className={`grid gap-4 ${lists.length === 2 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"}`}>
        {lists.map((list, idx) => {
          const a = ACCENT[idx % 3];
          const aReport = report?.analyses.find((x) => x.id === list.id);
          const dupeTotal = aReport ? aReport.fullDupes.length + aReport.numDupes.length : null;
          return (
            <div
              key={list.id}
              className={`pop-in flex flex-col rounded-xl border bg-white transition-all duration-200 ${
                dragId === list.id ? `${a.drag} shadow-lg scale-[1.01]` : "border-ink-200/80 shadow-sm"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragId(list.id); }}
              onDragLeave={() => setDragId(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragId(null);
                const f = e.dataTransfer.files?.[0];
                if (f) readFile(list.id, f);
              }}
            >
              <div className="flex items-center gap-2.5 px-3.5 pt-3.5 pb-2.5">
                <span className={`w-7 h-7 rounded-lg ${a.badge} font-mono text-[13px] font-bold flex items-center justify-center shrink-0`}>
                  {LETTERS[idx % 3]}
                </span>
                <input
                  className="flex-1 min-w-0 bg-transparent text-[13.5px] font-bold text-ink-900 outline-none border-b border-transparent focus:border-moss-500/50 transition-colors py-0.5"
                  value={list.name}
                  onChange={(e) => patch(list.id, { name: e.target.value })}
                  placeholder="Название списка"
                />
                <input
                  ref={(el) => { fileRefs.current[list.id] = el; }}
                  type="file"
                  accept=".txt,.csv,.log,.tsv,text/plain,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) readFile(list.id, f);
                    e.target.value = "";
                  }}
                />
                <button className="icon-btn" title="Загрузить файл (TXT/CSV)" onClick={() => fileRefs.current[list.id]?.click()}>
                  <IconUpload size={13} />
                </button>
                <button
                  className="icon-btn"
                  title="Открыть в большом редакторе"
                  onClick={() => setEditingId(list.id)}
                >
                  <IconEditor size={13} />
                </button>
                {lists.length > 2 && (
                  <button className="icon-btn danger" title="Убрать список" onClick={() => setLists((prev) => prev.filter((l) => l.id !== list.id))}>
                    <IconX size={13} />
                  </button>
                )}
              </div>

              <div className="px-3.5 pb-2">
                <textarea
                  className="checker-area"
                  rows={9}
                  spellCheck={false}
                  placeholder={"Вставьте список или перетащите файл…\n1_ Позиция первая\n2_ Позиция вторая\n3_ Позиция третья"}
                  value={list.raw}
                  onChange={(e) => patch(list.id, { raw: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between px-3.5 py-2.5 border-t border-ink-200/60 bg-paper-2 rounded-b-xl">
                <span className="font-mono text-[11px] font-bold text-ink-600">
                  {liveCounts[idx]} <span className="text-ink-400 font-semibold">строк</span>
                </span>
                {aReport && (
                  <span className={`pop-in inline-flex items-center gap-1.5 font-mono text-[10.5px] font-bold rounded-full border px-2 py-0.5 ${
                    dupeTotal === 0 ? "bg-moss-500/12 text-moss-700 border-moss-500/30" : "bg-rust/10 text-rust border-rust/30"
                  }`}>
                    {dupeTotal === 0 ? <IconCheck size={11} /> : <IconAlert size={11} />}
                    дубликаты: {dupeTotal === 0 ? "нет" : dupeTotal}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Отчёт */}
      {report ? (
        <section className="pop-in flex flex-col gap-4">
          {/* Вердикт */}
          <div className={`flex items-center gap-3.5 rounded-xl border-2 px-5 py-4 ${
            passed ? "border-moss-500/60 bg-moss-500/10" : "border-rust/50 bg-rust/8"
          }`}>
            <span className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white ${passed ? "bg-moss-600" : "bg-rust"}`}>
              {passed ? <IconCheck size={20} /> : <IconAlert size={20} />}
            </span>
            <div>
              <div className={`font-display text-[15px] font-bold ${passed ? "text-moss-700" : "text-rust"}`}>
                {passed ? "Все проверки пройдены" : `Найдено проблем: ${report.errors + report.warns}`}
              </div>
              <div className="text-[12px] text-ink-500 mt-0.5">
                {passed
                  ? "Количество строк, порядок номеров и уникальность — всё согласовано."
                  : `Ошибок: ${report.errors} · Предупреждений: ${report.warns}. Сверено позиций: ${report.positionsChecked}.`}
              </div>
            </div>
          </div>

          {/* Сводные плитки */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <SummaryTile title="Количество строк" ok={report.countsMatch} okText="одинаково" badText="различается">
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {report.analyses.map((a, i) => (
                  <span key={a.id} className={`font-mono text-[11px] font-bold rounded-md border px-2 py-0.5 ${ACCENT[i % 3].chip}`}>
                    {LETTERS[i % 3]}: {a.total}
                  </span>
                ))}
              </div>
            </SummaryTile>

            <SummaryTile title="Порядок номеров" ok={report.numbersMatch} okText="совпадает" badText={`${report.mismatches.length} расхожд.`}>
              <p className="text-[11px] text-ink-400 mt-1.5">
                Первые числа «1_», «2_», … сверены по {report.positionsChecked} позициям.
              </p>
            </SummaryTile>

            <SummaryTile title="Дубликаты" ok={report.dupeCount === 0} okText="не найдено" badText={`${report.dupeCount} шт`}>
              <p className="text-[11px] text-ink-400 mt-1.5">
                Повторы строк и одинаковые номера внутри списков{report.crossDupes.length > 0 ? `; пересечений между списками: ${report.crossDupes.length}` : ""}.
              </p>
            </SummaryTile>
          </div>

          {/* Таблица расхождений */}
          {report.mismatches.length > 0 && (
            <div className="rounded-xl border border-rust/30 bg-white overflow-hidden">
              <div className="px-4 py-2.5 border-b border-ink-200/60 bg-rust/6">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-rust">
                  Расхождения номеров по позициям
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-paper-2 text-ink-500">
                      <th className="text-left font-bold px-4 py-2 w-[90px]">Позиция</th>
                      {report.analyses.map((a, i) => (
                        <th key={a.id} className="text-left font-bold px-4 py-2">
                          <span className="inline-flex items-center gap-1.5">
                            <span className={`w-4 h-4 rounded ${ACCENT[i % 3].badge} font-mono text-[9px] flex items-center justify-center`}>{LETTERS[i % 3]}</span>
                            {a.name}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.mismatches.slice(0, 15).map((m) => {
                      const majority = mostCommon(m.values);
                      return (
                        <tr key={m.pos} className="border-t border-ink-200/40 hover:bg-paper-2 transition-colors">
                          <td className="px-4 py-1.5 font-mono font-bold text-ink-700">#{m.pos}</td>
                          {m.values.map((v, i) => (
                            <td key={i} className="px-4 py-1.5">
                              <span className={`font-mono font-bold px-2 py-0.5 rounded-md ${
                                v === null || v !== majority ? "bg-rust/12 text-rust" : "text-ink-700"
                              }`}>
                                {v === null ? "—" : v}
                              </span>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {report.mismatches.length > 15 && (
                  <div className="px-4 py-2 text-[11px] font-semibold text-ink-400 border-t border-ink-200/40">
                    Показаны первые 15 из {report.mismatches.length} расхождений
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Список проблем */}
          {report.issues.length > 0 ? (
            <div className="rounded-xl border border-ink-200/70 bg-white overflow-hidden">
              <div className="px-4 py-2.5 border-b border-ink-200/60 bg-paper-2">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-600">
                  Детали · {report.issues.length}
                </span>
              </div>
              <ul className="divide-y divide-ink-200/40">
                {report.issues.map((iss, i) => (
                  <li key={i} className="flex items-start gap-2.5 px-4 py-2.5 hover:bg-paper-2 transition-colors">
                    <span className={`mt-px shrink-0 rounded-md p-1 ${
                      iss.severity === "error" ? "text-rust bg-rust/12" : "text-amber-warn bg-amber-warn/15"
                    }`}>
                      {iss.severity === "error" ? <IconAlert size={12} /> : <IconInfo size={12} />}
                    </span>
                    {iss.list && (
                      <span className="shrink-0 mt-px font-mono text-[10px] font-bold text-ink-500 bg-ink-200/50 rounded px-1.5 py-0.5">
                        {iss.list}
                      </span>
                    )}
                    <span className="text-[12.5px] text-ink-800 leading-snug">{iss.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-xl border border-moss-500/30 bg-moss-500/6 px-4 py-3 flex items-center gap-2.5">
              <IconFileText size={15} className="text-moss-600" />
              <span className="text-[12.5px] font-semibold text-moss-700">
                Замечаний нет: строки уникальны, нумерация последовательная, списки синхронизированы.
              </span>
            </div>
          )}
        </section>
      ) : (
        <div className="rounded-xl border border-dashed border-ink-200/90 bg-white/50 px-5 py-6 flex items-center justify-center gap-3 text-ink-400">
          <IconClipboardCheck size={18} />
          <p className="text-[12.5px] font-semibold">
            {filled < 2
              ? "Заполните минимум 2 списка (или нажмите «Пример») и запустите проверку"
              : "Списки готовы — нажмите «Проверить», чтобы получить отчёт"}
          </p>
        </div>
      )}

      {/* Полноэкранный редактор текста */}
      {editingList && (
        <TextEditorModal
          title={`Список ${editingList.name || "без названия"}`}
          initial={editingList.raw}
          onClose={() => setEditingId(null)}
          onSave={(text) => {
            patch(editingList.id, { raw: text });
            setEditingId(null);
            onToast("Текст списка обновлён", "success");
          }}
        />
      )}
    </div>
  );
}

/* ── вспомогательные ── */

function SummaryTile({ title, ok, okText, badText, children }: {
  title: string; ok: boolean; okText: string; badText: string; children?: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border px-4 py-3.5 transition-colors ${ok ? "border-moss-500/35 bg-white" : "border-rust/40 bg-rust/5"}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-extrabold uppercase tracking-[0.13em] text-ink-500">{title}</span>
        <span className={`pop-in inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10.5px] font-bold ${
          ok ? "bg-moss-500/12 text-moss-700 border-moss-500/30" : "bg-rust/10 text-rust border-rust/30"
        }`}>
          {ok ? <IconCheck size={11} /> : <IconX size={11} />}
          {ok ? okText : badText}
        </span>
      </div>
      {children}
    </div>
  );
}

function mostCommon(values: (number | null)[]): number | null {
  const counts = new Map<number, number>();
  for (const v of values) {
    if (v !== null) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best: number | null = null;
  let bestN = 0;
  for (const [v, n] of counts) {
    if (n > bestN) { best = v; bestN = n; }
  }
  return best;
}
