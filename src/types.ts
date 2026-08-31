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

export type BarcodeState = "none" | "ok" | "error";

export interface LabelData {
  name: string;
  file: string;
  order: string;
  material: string;
  code: string;
  quantity: string;
  barcodeText: string;
  barcodeState: BarcodeState;
  barcodeImage: string | null;
  image: string | null;
  uniqueIndex: number;
  copyIndex: number;
  totalCopies: number;
}

export type ToastKind = "success" | "error" | "info";

export interface ToastItem {
  id: number;
  kind: ToastKind;
  text: string;
}

export interface ExportProgress {
  pct: number;
  label: string;
}
