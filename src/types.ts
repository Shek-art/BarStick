export interface FieldsState {
  name: string;
  file: string;
  order: string;
  material: string;
  code: string;
  quantity: string;
  barcode: string;
  copies: string;
}

export type FieldKey = keyof FieldsState;

export interface SameFlags {
  order: boolean;
  material: boolean;
  quantity: boolean;
}

/* ── Настройки наклейки ─────────────────────────────────── */

export type RowKey =
  | "supplier"
  | "name"
  | "file"
  | "order"
  | "material"
  | "code"
  | "quantity"
  | "barcode";

export interface RowConfig {
  visible: boolean;
  height: number;
}

export interface CustomField {
  id: string;
  title: string;
}

export interface LabelSettings {
  logo: string | null;
  showLogo: boolean;
  widthMm: number;
  heightMm: number;
  fontFamily: string;
  fontSize: number;
  borderWidth: number;
  borderColor: string;
  headerBg: string;
  zebra: boolean;
  rows: Record<RowKey, RowConfig>;
  customFields: CustomField[];
}

/* ── Данные наклейки ────────────────────────────────────── */

export interface LabelData {
  name: string;
  file: string;
  order: string;
  material: string;
  code: string;
  quantity: string;
  barcodeText: string;
  barcodeState: "ok" | "error" | "none";
  barcodeImage: string | null;
  image: string | null;
  uniqueIndex: number;
  copyIndex: number;
  totalCopies: number;
  custom: Record<string, string>;
}

/* ── UI ─────────────────────────────────────────────────── */

export type ToastKind = "success" | "error" | "info";

export interface ToastItem {
  id: number;
  text: string;
  kind: ToastKind;
}

export interface ExportProgress {
  pct: number;
  label: string;
}

export type MediaKind = "images" | "barcodes";
