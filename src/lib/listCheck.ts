export interface ListInput {
  id: string;
  name: string;
  raw: string;
}

export interface ParsedLine {
  /** номер строки в файле (1-based) */
  no: number;
  text: string;
  /** первое число в начале строки: «1_», «12 » , «123-…» */
  leading: number | null;
}

export interface ListAnalysis {
  id: string;
  name: string;
  total: number;
  lines: ParsedLine[];
  /** Полностью одинаковые строки */
  fullDupes: { text: string; lineNos: number[] }[];
  /** Одинаковые первые номера у разных строк */
  numDupes: { num: number; lineNos: number[] }[];
  /** Строки без числа в начале */
  noLeading: number[];
  /** Нарушения порядка 1, 2, 3, … */
  seqBreaks: { lineNo: number; prev: number; got: number }[];
}

export interface PositionMismatch {
  /** позиция (1-based) среди непустых строк */
  pos: number;
  values: (number | null)[];
}

export interface CrossDupe {
  text: string;
  lists: string[];
}

export type Severity = "error" | "warn";

export interface Issue {
  severity: Severity;
  list: string | null;
  text: string;
}

export interface CheckReport {
  analyses: ListAnalysis[];
  countsMatch: boolean;
  positionsChecked: number;
  mismatches: PositionMismatch[];
  numbersMatch: boolean;
  crossDupes: CrossDupe[];
  dupeCount: number;
  issues: Issue[];
  errors: number;
  warns: number;
}

export function countNonEmpty(raw: string): number {
  return raw.split(/\r?\n/).filter((l) => l.trim()).length;
}

const LEADING_RE = /^\s*(\d+)/;

export function analyzeList(list: ListInput): ListAnalysis {
  const lines: ParsedLine[] = [];
  list.raw.split(/\r?\n/).forEach((rawLine, idx) => {
    const text = rawLine.trim();
    if (!text) return;
    const m = text.match(LEADING_RE);
    lines.push({ no: idx + 1, text, leading: m ? Number(m[1]) : null });
  });

  /* Полные дубликаты строк */
  const byText = new Map<string, number[]>();
  lines.forEach((l) => {
    const key = l.text.toLowerCase();
    byText.set(key, [...(byText.get(key) ?? []), l.no]);
  });
  const fullDupes = [...byText.entries()]
    .filter(([, nos]) => nos.length > 1)
    .map(([key, nos]) => ({ text: lines.find((l) => l.text.toLowerCase() === key)!.text, lineNos: nos }));

  /* Дубликаты первых номеров */
  const byNum = new Map<number, number[]>();
  lines.forEach((l) => {
    if (l.leading === null) return;
    byNum.set(l.leading, [...(byNum.get(l.leading) ?? []), l.no]);
  });
  const numDupes = [...byNum.entries()]
    .filter(([, nos]) => nos.length > 1)
    .map(([num, nos]) => ({ num, lineNos: nos }))
    .sort((a, b) => a.num - b.num);

  const noLeading = lines.filter((l) => l.leading === null).map((l) => l.no);

  /* Порядок следования номеров 1, 2, 3, … */
  const seqBreaks: ListAnalysis["seqBreaks"] = [];
  let prev = 0;
  for (const l of lines) {
    if (l.leading === null) continue;
    if (l.leading !== prev + 1) seqBreaks.push({ lineNo: l.no, prev, got: l.leading });
    prev = l.leading;
  }

  return { id: list.id, name: list.name, total: lines.length, lines, fullDupes, numDupes, noLeading, seqBreaks };
}

export function runChecks(lists: ListInput[]): CheckReport {
  const analyses = lists.map(analyzeList);
  const issues: Issue[] = [];

  /* 1. Одинаковое количество строк */
  const totals = analyses.map((a) => a.total);
  const countsMatch = totals.every((t) => t === totals[0]);
  if (!countsMatch) {
    issues.push({
      severity: "error",
      list: null,
      text: `Количество строк различается: ${analyses.map((a) => `${a.name} — ${a.total}`).join(", ")}`,
    });
  }

  /* 2. Совпадение первых номеров по позициям */
  const minLen = Math.min(...analyses.map((a) => a.lines.length));
  const mismatches: PositionMismatch[] = [];
  for (let i = 0; i < minLen; i++) {
    const values = analyses.map((a) => a.lines[i].leading);
    const first = values[0];
    if (values.some((v) => v === null) || values.some((v) => v !== first)) {
      mismatches.push({ pos: i + 1, values });
    }
  }
  const numbersMatch = mismatches.length === 0 && countsMatch;

  if (!numbersMatch && mismatches.length > 0) {
    const shown = mismatches.slice(0, 12);
    shown.forEach((m) => {
      issues.push({
        severity: "error",
        list: null,
        text: `Позиция ${m.pos}: номера не совпадают — ${analyses
          .map((a, i) => `${a.name}: ${m.values[i] === null ? "нет номера" : m.values[i]}`)
          .join(" · ")}`,
      });
    });
    if (mismatches.length > shown.length) {
      issues.push({
        severity: "error",
        list: null,
        text: `…и ещё ${mismatches.length - shown.length} расхождений (см. таблицу ниже)`,
      });
    }
  }

  /* 3. Дубликаты внутри списков */
  let dupeCount = 0;
  for (const a of analyses) {
    for (const d of a.fullDupes) {
      dupeCount += d.lineNos.length - 1;
      issues.push({
        severity: "error",
        list: a.name,
        text: `Повтор строки «${truncate(d.text, 60)}» — строки ${d.lineNos.join(", ")}`,
      });
    }
    for (const d of a.numDupes) {
      dupeCount += d.lineNos.length - 1;
      issues.push({
        severity: "error",
        list: a.name,
        text: `Номер ${d.num} встречается ${d.lineNos.length} раза — строки ${d.lineNos.join(", ")}`,
      });
    }
  }

  /* 4. Предупреждения: строки без номера, сбой порядка */
  for (const a of analyses) {
    if (a.noLeading.length > 0) {
      issues.push({
        severity: "warn",
        list: a.name,
        text: `Строки без числа в начале: ${a.noLeading.slice(0, 10).join(", ")}${a.noLeading.length > 10 ? "…" : ""}`,
      });
    }
    for (const b of a.seqBreaks.slice(0, 8)) {
      issues.push({
        severity: "warn",
        list: a.name,
        text:
          b.prev === 0
            ? `Нумерация начинается с ${b.got}, а не с 1 (строка ${b.lineNo})`
            : `Сбой порядка: после ${b.prev} идёт ${b.got} (строка ${b.lineNo})`,
      });
    }
    if (a.seqBreaks.length > 8) {
      issues.push({ severity: "warn", list: a.name, text: `…и ещё ${a.seqBreaks.length - 8} сбоев порядка` });
    }
  }

  /* 5. Пересечения между списками (одинаковые строки в разных списках — часто это ошибка) */
  const textMap = new Map<string, string[]>();
  for (const a of analyses) {
    for (const l of a.lines) {
      const key = l.text.toLowerCase();
      const arr = textMap.get(key) ?? [];
      if (!arr.includes(a.name)) arr.push(a.name);
      textMap.set(key, arr);
    }
  }
  const crossDupes: CrossDupe[] = [];
  for (const [key, names] of textMap.entries()) {
    if (names.length > 1) {
      const sample = analyses.flatMap((a) => a.lines).find((l) => l.text.toLowerCase() === key)!.text;
      crossDupes.push({ text: sample, lists: names });
      if (crossDupes.length >= 15) break;
    }
  }
  for (const c of crossDupes) {
    issues.push({
      severity: "warn",
      list: null,
      text: `Строка «${truncate(c.text, 50)}» присутствует сразу в: ${c.lists.join(", ")}`,
    });
  }

  const errors = issues.filter((i) => i.severity === "error").length;
  const warns = issues.filter((i) => i.severity === "warn").length;

  return {
    analyses,
    countsMatch,
    positionsChecked: minLen,
    mismatches,
    numbersMatch,
    crossDupes,
    dupeCount,
    issues,
    errors,
    warns,
  };
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
