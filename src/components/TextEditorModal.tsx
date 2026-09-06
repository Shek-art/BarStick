import { useEffect, useMemo, useRef, useState } from "react";
import Modal from "./Modal";
import { countNonEmpty } from "../lib/listCheck";
import {
  IconCheck, IconSearch, IconArrowUp, IconArrowDown, IconReplace, IconTrash, IconX,
} from "./icons";

interface Props {
  title: string;
  initial: string;
  onClose: () => void;
  onSave: (text: string) => void;
  notify?: (text: string, kind?: "success" | "error" | "info") => void;
}

interface Match {
  start: number;
  end: number;
}

const MAX_HL = 3000;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Большое окно редактирования списка с инструментами:
 * поиск с подсветкой совпадений, переходы, замена (одно/все),
 * удаление вхождений и быстрые операции над строками.
 */
export default function TextEditorModal({ title, initial, onClose, onSave, notify }: Props) {
  const [text, setText] = useState(initial);
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [cur, setCur] = useState(0);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const bdRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const dirty = text !== initial;
  const lines = countNonEmpty(text);

  /* ── Поиск: позиции всех совпадений ── */
  const matches = useMemo<Match[]>(() => {
    if (!query) return [];
    try {
      const re = new RegExp(escapeRegExp(query), matchCase ? "g" : "gi");
      const out: Match[] = [];
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null && out.length < MAX_HL) {
        if (m[0].length === 0) { re.lastIndex++; continue; }
        out.push({ start: m.index, end: m.index + m[0].length });
      }
      return out;
    } catch {
      return [];
    }
  }, [text, query, matchCase]);

  /* Держим курсор в допустимых пределах */
  useEffect(() => {
    if (matches.length === 0) { setCur(0); return; }
    setCur((c) => Math.min(c, matches.length - 1));
  }, [matches.length]);

  /* Выделить и показать совпадение №i */
  const selectMatch = (i: number) => {
    if (matches.length === 0) return;
    const idx = ((i % matches.length) + matches.length) % matches.length;
    setCur(idx);
    const { start, end } = matches[idx];
    const ta = taRef.current;
    if (ta) {
      ta.focus();
      ta.setSelectionRange(start, end);
      /* Прокрутка к совпадению: ищем его mark в подложке */
      const mark = bdRef.current?.querySelector<HTMLElement>(`[data-mi="${idx}"]`);
      if (mark) {
        const target = Math.max(0, mark.offsetTop - ta.clientHeight / 2 + mark.offsetHeight);
        ta.scrollTop = target;
        if (bdRef.current) bdRef.current.scrollTop = target;
      }
    }
  };

  /* Enter в поле поиска — следующее, Shift+Enter — предыдущее (с зацикливанием) */
  const onSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (matches.length === 0) return;
      selectMatch(e.shiftKey ? cur - 1 : cur + 1);
    }
  };

  /* При новом запросе — сразу к первому совпадению */
  useEffect(() => {
    if (query && matches.length > 0) selectMatch(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, matchCase]);

  /* ── Замена / удаление ── */
  const applyMatches = (repl: string): number => {
    if (matches.length === 0) return 0;
    let out = "";
    let pos = 0;
    for (const m of matches) {
      out += text.slice(pos, m.start) + repl;
      pos = m.end;
    }
    out += text.slice(pos);
    setText(out);
    return matches.length;
  };

  const replaceOne = () => {
    if (matches.length === 0) return;
    const { start, end } = matches[cur];
    setText(text.slice(0, start) + replacement + text.slice(end));
    notify?.("Заменено: 1", "success");
  };

  const replaceAll = () => {
    const n = applyMatches(replacement);
    notify?.(n > 0 ? `Заменено вхождений: ${n}` : "Совпадений нет", n > 0 ? "success" : "info");
  };

  const deleteOccurrences = () => {
    const n = applyMatches("");
    notify?.(n > 0 ? `Удалено вхождений: ${n}` : "Совпадений нет", n > 0 ? "success" : "info");
  };

  /* ── Быстрые операции над строками ── */
  const removeEmptyLines = () => {
    const parts = text.split("\n");
    const kept = parts.filter((s) => s.trim() !== "");
    const removed = parts.length - kept.length;
    if (removed === 0) { notify?.("Пустых строк нет", "info"); return; }
    setText(kept.join("\n"));
    notify?.(`Удалено пустых строк: ${removed}`, "success");
  };

  const trimLines = () => {
    const parts = text.split("\n");
    const out = parts.map((s) => s.trim()).join("\n");
    if (out === text) { notify?.("Лишних пробелов нет", "info"); return; }
    setText(out);
    notify?.("Пробелы по краям строк убраны", "success");
  };

  const renumber = () => {
    let n = 0;
    const out = text
      .split("\n")
      .map((s) => {
        if (s.trim() === "") return s;
        n++;
        const stripped = s.replace(/^\s*\d{1,6}\s*[_\-–—.)]?\s*/, "");
        return `${n}_ ${stripped}`;
      })
      .join("\n");
    setText(out);
    notify?.(`Строки перенумерованы: 1_ … ${n}_`, "success");
  };

  /* ── Подсветка: сегменты текста с mark-ами ── */
  const segments = useMemo(() => {
    const nodes: React.ReactNode[] = [];
    let pos = 0;
    matches.forEach((m, k) => {
      if (m.start > pos) nodes.push(text.slice(pos, m.start));
      nodes.push(
        <mark key={k} data-mi={k} className={k === cur ? "hl hl-cur" : "hl"}>
          {text.slice(m.start, m.end)}
        </mark>
      );
      pos = m.end;
    });
    if (pos < text.length) nodes.push(text.slice(pos));
    nodes.push(" "); /* хвост, чтобы высоты подложки и поля совпадали */
    return nodes;
  }, [text, matches, cur]);

  const syncScroll = () => {
    if (taRef.current && bdRef.current) bdRef.current.scrollTop = taRef.current.scrollTop;
  };

  const toolBtn =
    "flex items-center gap-1.5 rounded-lg border border-ink-200/80 bg-white px-2.5 py-1.5 text-[11.5px] font-bold text-ink-700 hover:border-moss-500/60 hover:text-moss-700 hover:bg-moss-500/6 active:scale-95 transition-all cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed";

  return (
    <Modal
      title="Редактор списка"
      subtitle={title}
      onClose={onClose}
      width={900}
      footer={
        <>
          <span className="mr-auto flex items-center gap-3 font-mono text-[11px] font-bold text-ink-500">
            <span>
              строк: <span className={lines > 0 ? "text-moss-700" : "text-ink-300"}>{lines}</span>
            </span>
            <span>
              символов: <span className="text-ink-700">{text.length}</span>
            </span>
            {query && (
              <span className="pop-in">
                совпадений:{" "}
                <span className={matches.length > 0 ? "text-moss-700" : "text-rust"}>
                  {matches.length >= MAX_HL ? `${MAX_HL}+` : matches.length}
                </span>
              </span>
            )}
          </span>
          <button
            className="px-3.5 py-2 rounded-lg border border-ink-200/80 text-ink-600 text-[12px] font-bold hover:bg-ink-200/40 transition-colors cursor-pointer"
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-moss-600 text-white text-[12px] font-bold hover:bg-moss-500 transition-colors cursor-pointer disabled:opacity-40"
            onClick={() => onSave(text)}
            disabled={!dirty}
            title={dirty ? "Сохранить изменения" : "Нет изменений"}
          >
            <IconCheck size={13} /> Применить
          </button>
        </>
      }
    >
      <div className="p-4 flex flex-col gap-3">
        {/* ── Панель инструментов ── */}
        <div className="rounded-xl border border-ink-200/70 bg-paper-2 p-2.5 flex flex-col gap-2">
          {/* Поиск */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[220px] rounded-lg border border-ink-200/80 bg-white px-2.5 py-1.5 focus-within:border-moss-500 focus-within:ring-2 focus-within:ring-moss-500/15 transition-all">
              <IconSearch size={13} className={query ? "text-moss-600" : "text-ink-300"} />
              <input
                ref={searchRef}
                className="flex-1 bg-transparent outline-none text-[12.5px] font-semibold text-ink-900 placeholder:text-ink-300"
                placeholder="Найти… (Enter — дальше, Shift+Enter — назад)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onSearchKey}
              />
              {query && (
                <button
                  className="text-ink-300 hover:text-rust transition-colors cursor-pointer"
                  onClick={() => { setQuery(""); searchRef.current?.focus(); }}
                  title="Очистить поиск"
                >
                  <IconX size={12} />
                </button>
              )}
            </div>

            <button
              className={`tool-btn font-mono tracking-tight ${matchCase ? "!border-moss-500/70 !bg-moss-500/12 !text-moss-700" : ""}`}
              onClick={() => setMatchCase((v) => !v)}
              title="Учитывать регистр"
            >
              Aa
            </button>

            <button className="tool-btn !px-2" onClick={() => selectMatch(cur - 1)} disabled={matches.length === 0} title="Предыдущее (Shift+Enter)">
              <IconArrowUp size={13} />
            </button>
            <button className="tool-btn !px-2" onClick={() => selectMatch(cur + 1)} disabled={matches.length === 0} title="Следующее (Enter)">
              <IconArrowDown size={13} />
            </button>

            <span
              key={`${cur}-${matches.length}`}
              className={`pop-in font-mono text-[11px] font-bold rounded-md px-2 py-1 border ${
                query === ""
                  ? "text-ink-300 border-ink-200/60 bg-white"
                  : matches.length > 0
                    ? "text-moss-700 border-moss-500/30 bg-moss-500/12"
                    : "text-rust border-rust/30 bg-rust/8"
              }`}
            >
              {query === "" ? "— / —" : matches.length === 0 ? "0 / 0" : `${cur + 1} / ${matches.length}`}
            </span>
          </div>

          {/* Замена и удаление */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center flex-1 min-w-[220px] rounded-lg border border-ink-200/80 bg-white px-2.5 py-1.5 focus-within:border-sky-info focus-within:ring-2 focus-within:ring-sky-info/15 transition-all">
              <IconReplace size={13} className="text-ink-300" />
              <input
                className="ml-2 flex-1 bg-transparent outline-none text-[12.5px] font-semibold text-ink-900 placeholder:text-ink-300"
                placeholder="Заменить на… (пусто = удалить)"
                value={replacement}
                onChange={(e) => setReplacement(e.target.value)}
              />
            </div>

            <button className={toolBtn} onClick={replaceOne} disabled={matches.length === 0} title="Заменить текущее совпадение">
              Заменить
            </button>
            <button className={toolBtn} onClick={replaceAll} disabled={matches.length === 0} title="Заменить все совпадения">
              Все
            </button>
            <span className="w-px h-6 bg-ink-200/80 mx-0.5" />
            <button className={`${toolBtn} hover:!border-rust/60 hover:!text-rust hover:!bg-rust/6`} onClick={deleteOccurrences} disabled={matches.length === 0} title="Удалить все найденные вхождения">
              <IconTrash size={12} /> Удалить вхождения
            </button>
          </div>

          {/* Быстрые операции */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5 border-t border-dashed border-ink-200/70">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink-400 mr-1">
              Быстрые операции
            </span>
            <button className="chip-btn" onClick={removeEmptyLines} title="Убрать пустые строки">
              Пустые строки
            </button>
            <button className="chip-btn" onClick={trimLines} title="Убрать пробелы в начале и конце каждой строки">
              Пробелы по краям
            </button>
            <button className="chip-btn" onClick={renumber} title="Проставить последовательные номера 1_, 2_, … по непустым строкам">
              Нумерация 1_
            </button>
          </div>
        </div>

        {/* ── Поле с подсветкой совпадений ── */}
        <div className="editor-shell">
          <div ref={bdRef} className="editor-backdrop" aria-hidden>
            {segments}
          </div>
          <textarea
            ref={taRef}
            className="editor-ta"
            autoFocus
            spellCheck={false}
            placeholder={"Вставьте список…\n1_ Позиция первая\n2_ Позиция вторая"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onScroll={syncScroll}
          />
        </div>

        <p className="text-[10.5px] text-ink-400 leading-snug">
          Совпадения подсвечиваются прямо в тексте, текущее — янтарным. Каждая строка списка — с новой строки;
          первые числа «1_», «2_», … используются для сверки. Изменения попадут в карточку после «Применить» (Esc — отмена).
        </p>
      </div>
    </Modal>
  );
}
