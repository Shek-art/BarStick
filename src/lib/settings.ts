import type { LabelSettings, RowKey } from "../types";

export const SETTINGS_KEY = "nkl4k:settings";

export const DEFAULT_SETTINGS: LabelSettings = {
  logo: null,
  showLogo: true,
  width: 500,
  height: 850,
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

export const SIZE_PRESETS = [
  { label: "500 × 850", w: 500, h: 850, note: "Стандарт" },
  { label: "400 × 600", w: 400, h: 600, note: "Компакт" },
  { label: "600 × 900", w: 600, h: 900, note: "Крупная" },
  { label: "380 × 520", w: 380, h: 520, note: "Мини" },
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

export function loadSettings(): LabelSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<LabelSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      rows: { ...DEFAULT_SETTINGS.rows, ...(parsed.rows ?? {}) },
      customFields: Array.isArray(parsed.customFields) ? parsed.customFields : [],
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
