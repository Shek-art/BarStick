import type { LabelSettings, RowKey } from "../types";

export const SETTINGS_KEY = "nkl4k:settings";

/** Пикселей на миллиметр при экспорте (PDF, ZIP, печать) */
export const EXPORT_PX_PER_MM = 10;

export const DEFAULT_SETTINGS: LabelSettings = {
  logo: null,
  showLogo: true,
  widthMm: 50,
  heightMm: 85,
  fontFamily: "Arial",
  fontSize: 13.5,
  borderWidth: 2,
  borderColor: "#000000",
  headerBg: "#f2f7ec",
  zebra: false,
  rows: {
    supplier: { visible: true, height: 60 },
    name: { visible: true, height: 70 },
    file: { visible: true, height: 40 },
    order: { visible: true, height: 40 },
    material: { visible: true, height: 40 },
    code: { visible: true, height: 50 },
    quantity: { visible: true, height: 70 },
    barcode: { visible: true, height: 160 },
  },
  customFields: [],
};

export const MM_PRESETS = [
  { label: "50×85", w: 50, h: 85, note: "Стандарт" },
  { label: "40×60", w: 40, h: 60, note: "Компакт" },
  { label: "60×90", w: 60, h: 90, note: "Крупная" },
  { label: "38×52", w: 38, h: 52, note: "Мини" },
];

export const FONTS = [
  "Arial",
  "Verdana",
  "Tahoma",
  "Segoe UI",
  "Trebuchet MS",
  "Georgia",
  "Times New Roman",
  "Courier New",
];

export const BORDER_COLORS = ["#000000", "#1e3a2f", "#14213d", "#5c5c5c", "#1e7a48", "#8a3324"];

export const HEADER_BGS = ["#f2f7ec", "#ffffff", "#e9f2fb", "#fdf1dc", "#fdecec", "#e6e6e6", "#000000"];

export const ROW_ORDER: RowKey[] = [
  "supplier", "name", "file", "order", "material", "code", "quantity", "barcode",
];

export const ROW_TITLES: Record<RowKey, string> = {
  supplier: "Поставщик",
  name: "Наименование",
  file: "Файл",
  order: "Заказ",
  material: "Материал",
  code: "Код товара",
  quantity: "Количество",
  barcode: "Штрих-код",
};

/** Размер наклейки в экранных/экспортных пикселях (10 px = 1 мм) */
export function labelPx(s: LabelSettings): { w: number; h: number } {
  return {
    w: Math.round(s.widthMm * EXPORT_PX_PER_MM),
    h: Math.round(s.heightMm * EXPORT_PX_PER_MM),
  };
}

export function loadSettings(): LabelSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    /* Миграция со старого формата в пикселях */
    let widthMm = Number(parsed.widthMm);
    let heightMm = Number(parsed.heightMm);
    if (!widthMm && typeof parsed.width === "number") widthMm = Math.round(parsed.width / EXPORT_PX_PER_MM);
    if (!heightMm && typeof parsed.height === "number") heightMm = Math.round(parsed.height / EXPORT_PX_PER_MM);

    return {
      ...DEFAULT_SETTINGS,
      ...(parsed as Partial<LabelSettings>),
      widthMm: widthMm || DEFAULT_SETTINGS.widthMm,
      heightMm: heightMm || DEFAULT_SETTINGS.heightMm,
      rows: { ...DEFAULT_SETTINGS.rows, ...((parsed.rows as LabelSettings["rows"]) ?? {}) },
      customFields: Array.isArray(parsed.customFields) ? (parsed.customFields as LabelSettings["customFields"]) : [],
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: LabelSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* логотип может переполнить хранилище — не критично */
  }
}

/** Простая оценка тёмности цвета для выбора контрастного текста */
export function isDarkColor(hex: string): boolean {
  let m = hex.replace("#", "");
  if (m.length === 3) m = m.split("").map((c) => c + c).join("");
  if (m.length < 6) return false;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b < 140;
}
