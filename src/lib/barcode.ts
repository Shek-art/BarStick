import JsBarcode from "jsbarcode";

/** Контрольная цифра EAN-13 для 12 цифр */
export function ean13CheckDigit(twelve: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = Number(twelve[i]);
    sum += i % 2 === 0 ? d : d * 3;
  }
  return (10 - (sum % 10)) % 10;
}

export interface NormalizedBarcode {
  /** 13 цифр, если корректно */
  digits: string | null;
  state: "ok" | "error" | "empty";
}

/** Приводит строку к EAN-13: 12 цифр — добавляет контрольную, 13 — проверяет */
export function normalizeEan13(raw: string): NormalizedBarcode {
  const digits = raw.replace(/\D/g, "");
  if (!digits.trim() && !raw.trim()) return { digits: null, state: "empty" };
  if (digits.length === 12) {
    return { digits: digits + ean13CheckDigit(digits), state: "ok" };
  }
  if (digits.length === 13) {
    return ean13CheckDigit(digits.slice(0, 12)) === Number(digits[12])
      ? { digits, state: "ok" }
      : { digits: null, state: "error" };
  }
  return { digits: null, state: "error" };
}

/** Рисует EAN-13 в offscreen-canvas и возвращает PNG dataURL (или null) */
export function generateBarcodeDataUrl(digits: string): string | null {
  try {
    const canvas = document.createElement("canvas");
    JsBarcode(canvas, digits, {
      format: "EAN13",
      width: 2.1,
      height: 104,
      displayValue: true,
      fontSize: 21,
      font: "Arial",
      fontOptions: "bold",
      textMargin: 5,
      margin: 2,
      background: "#ffffff",
      lineColor: "#000000",
    });
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}
