export interface ListInput {
  id: string;
  name: string;
  raw: string;
}

export interface ListAnalysis {
  id: string;
  name: string;
  lines: string[];
  total: number;
  numbers: (number | null)[];
  fullDupes: { text: string; lines: number[] }[];
  numDupes: { num: number; lines: number[] }[];
  noNumberLines: number[];
  orderBreaks: { expected: number; got: number; line: number }[];
}

export interface Issue {
  severity: "error" | "warn";
  list?: string;
  text: string;
}

export interface CheckReport {
  analyses: ListAnalysis[];
  countsMatch: boolean;
  numbersMatch: boolean;
  mismatches: { pos: number; values: (number | null)[] }[];
  dupeCount: number;
  crossDupes: { a: string; b: string; text: string }[];
  issues: Issue[];
  errors: number;
  warns: number;
  positionsChecked: number;
}

export function countNonEmpty(raw: string): number {
  return raw.split("\n").map((s) => s.trim()).filter(Boolean).length;
}

/** Первое число строки: «1_», «1-», «1)», «1 » и т.п. */
export function parseLeadingNumber(line: string): number | null {
  const m = line.trim().match(/^(\d{1,6})\s*[_\-–—.)\s]/);
  return m ? parseInt(m[1], 10) : null;
}

function analyze(input: ListInput): ListAnalysis {
  const lines = input.raw.split("\n").map((s) => s.trim()).filter(Boolean);
  const numbers = lines.map(parseLeadingNumber);

  const byText = new Map<string, number[]>();
  lines.forEach((t, i) => {
    const key = t.toLowerCase();
    byText.set(key, [...(byText.get(key) ?? []), i + 1]);
  });
  const fullDupes = [...byText.entries()]
    .filter(([, ls]) => ls.length > 1)
    .map(([text, ls]) => ({ text: lines[ls[0] - 1], lines: ls }));

  const byNum = new Map<number, number[]>();
  numbers.forEach((n, i) => {
    if (n !== null) byNum.set(n, [...(byNum.get(n) ?? []), i + 1]);
  });
  const numDupes = [...byNum.entries()]
    .filter(([, ls]) => ls.length > 1)
    .map(([num, ls]) => ({ num, lines: ls }));

  const noNumberLines = numbers
    .map((n, i) => (n === null ? i + 1 : -1))
    .filter((n) => n > 0);

  const orderBreaks: ListAnalysis["orderBreaks"] = [];
  let prev: number | null = null;
  numbers.forEach((n, i) => {
    if (n === null) return;
    if (prev !== null && n !== prev + 1) {
      orderBreaks.push({ expected: prev + 1, got: n, line: i + 1 });
    }
    prev = n;
  });

  return { id: input.id, name: input.name, lines, total: lines.length, numbers, fullDupes, numDupes, noNumberLines, orderBreaks };
}

export function runChecks(inputs: ListInput[]): CheckReport {
  const filled = inputs.filter((l) => countNonEmpty(l.raw) > 0);
  const analyses = filled.map(analyze);
  const issues: Issue[] = [];

  /* ── Количество строк ── */
  const counts = analyses.map((a) => a.total);
  const countsMatch = counts.every((c) => c === counts[0]);
  if (!countsMatch && analyses.length > 1) {
    issues.push({
      severity: "error",
      text: `Разное количество строк: ${analyses.map((a) => `«${a.name}» — ${a.total}`).join(", ")}`,
    });
  }

  /* ── Дубликаты внутри списков ── */
  for (const a of analyses) {
    for (const d of a.fullDupes) {
      issues.push({
        severity: "error",
        list: a.name,
        text: `Полностью повторяющаяся строка «${d.text.length > 42 ? d.text.slice(0, 42) + "…" : d.text}» (строки ${d.lines.join(", ")})`,
      });
    }
    for (const d of a.numDupes) {
      issues.push({
        severity: "error",
        list: a.name,
        text: `Одинаковый номер ${d.num}_ у разных строк (${d.lines.join(", ")})`,
      });
    }
    if (a.noNumberLines.length > 0) {
      issues.push({
        severity: "warn",
        list: a.name,
        text: `Строки без номера в начале: ${a.noNumberLines.slice(0, 8).join(", ")}${a.noNumberLines.length > 8 ? "…" : ""}`,
      });
    }
    for (const b of a.orderBreaks) {
      issues.push({
        severity: "warn",
        list: a.name,
        text: `Сбой порядка нумерации: после ${b.expected - 1}_ идёт ${b.got}_ (строка ${b.line})`,
      });
    }
  }

  /* ── Сверка первых номеров по позициям ── */
  const maxLen = Math.max(0, ...analyses.map((a) => a.total));
  const mismatches: CheckReport["mismatches"] = [];
  for (let pos = 0; pos < maxLen; pos++) {
    const values = analyses.map((a) => (pos < a.numbers.length ? a.numbers[pos] : null));
    const distinct = [...new Set(values.filter((v): v is number => v !== null))];
    if (distinct.length > 1) {
      mismatches.push({ pos: pos + 1, values });
    }
  }
  const numbersMatch = mismatches.length === 0;
  if (!numbersMatch) {
    issues.push({
      severity: "error",
      text: `Первые номера расходятся в ${mismatches.length} позициях (например, #${mismatches[0].pos}: ${mismatches[0].values.map((v, i) => `${analyses[i]?.name ?? "?"} → ${v ?? "—"}`).join(", ")})`,
    });
  }

  /* ── Пересечения строк между списками ── */
  const crossDupes: CheckReport["crossDupes"] = [];
  for (let i = 0; i < analyses.length; i++) {
    for (let j = i + 1; j < analyses.length; j++) {
      const setB = new Set(analyses[j].lines.map((l) => l.toLowerCase()));
      for (const line of analyses[i].lines) {
        if (setB.has(line.toLowerCase())) {
          crossDupes.push({ a: analyses[i].name, b: analyses[j].name, text: line });
        }
      }
    }
  }
  if (crossDupes.length > 0) {
    issues.push({
      severity: "warn",
      text: `Между списками совпадает ${crossDupes.length} строк (например, «${crossDupes[0].text.slice(0, 40)}»)`,
    });
  }

  const errors = issues.filter((i) => i.severity === "error").length;
  const warns = issues.filter((i) => i.severity === "warn").length;
  const dupeCount = analyses.reduce((n, a) => n + a.fullDupes.length + a.numDupes.length, 0);

  return {
    analyses,
    countsMatch,
    numbersMatch,
    mismatches,
    dupeCount,
    crossDupes,
    issues,
    errors,
    warns,
    positionsChecked: maxLen,
  };
}
