import JSZip from "jszip";
import { jsPDF } from "jspdf";
import { toCanvas } from "html-to-image";
import type { LabelData } from "../types";
import { revealDownloaded } from "./electronBridge";

export interface ExportSize {
  w: number;
  h: number;
}

export interface ExportSizeMm {
  wMm: number;
  hMm: number;
}

export interface CancelToken {
  cancelled: boolean;
}

export class ExportCancelled extends Error {
  constructor() {
    super("Экспорт остановлен");
  }
}

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function stickerFileName(label: LabelData): string {
  const code = (label.code || "nakleyka").replace(/[\\/:*?"<>|\s]+/g, "_");
  return `${pad2(label.uniqueIndex)}-${pad2(label.copyIndex)}_${code}`;
}

/**
 * Захват наклейки в canvas.
 * html-to-image (SVG foreignObject): элемент отрисовывается самим браузером,
 * поэтому текст и вёрстка в файле совпадают с экраном пиксель в пиксель.
 */
async function captureLabel(el: HTMLElement, size: ExportSize): Promise<HTMLCanvasElement> {
  try {
    return await toCanvas(el, {
      width: size.w,
      height: size.h,
      pixelRatio: 1.5,
      backgroundColor: "#ffffff",
      skipFonts: true,
      cacheBust: false,
    });
  } catch (err) {
    console.warn("Не удалось отрисовать наклейку, используется заглушка:", err);
    const canvas = document.createElement("canvas");
    canvas.width = size.w * 1.5;
    canvas.height = size.h * 1.5;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 3;
      ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
      ctx.fillStyle = "#999999";
      ctx.font = "bold 30px Arial";
      ctx.textAlign = "center";
      ctx.fillText("Ошибка рендера изображения", canvas.width / 2, canvas.height / 2);
    }
    return canvas;
  }
}

/** Скачивание файла; в Electron дополнительно раскрывает папку «Загрузки» */
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  revealDownloaded(filename);
}

/** Экспорт всех наклеек в ZIP из JPG (масштаб 1.5×) */
export async function exportZip(
  labels: LabelData[],
  getElement: (i: number) => HTMLElement | null,
  size: ExportSize,
  onProgress: (pct: number) => void,
  token: CancelToken
): Promise<void> {
  const zip = new JSZip();
  let rendered = 0;

  for (let i = 0; i < labels.length; i++) {
    if (token.cancelled) throw new ExportCancelled();
    const el = getElement(i);
    if (el) {
      const canvas = await captureLabel(el, size);
      const data = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
      zip.file(`${stickerFileName(labels[i])}.jpg`, data, { base64: true });
      rendered++;
    }
    onProgress(Math.round(((i + 1) / labels.length) * 92));
    await nextFrame();
  }

  if (token.cancelled) throw new ExportCancelled();
  if (rendered === 0) throw new Error("Не удалось отрисовать ни одной наклейки — попробуйте ещё раз");
  onProgress(96);
  const blob = await zip.generateAsync({ type: "blob" });
  triggerDownload(blob, `nakleyki_4k_${Date.now()}.zip`);
  onProgress(100);
}

/** Экспорт всех наклеек в PDF (одна наклейка = одна страница, физический размер в мм) */
export async function exportPdf(
  labels: LabelData[],
  getElement: (i: number) => HTMLElement | null,
  size: ExportSize,
  sizeMm: ExportSizeMm,
  onProgress: (pct: number) => void,
  token: CancelToken
): Promise<void> {
  const orientation = sizeMm.hMm >= sizeMm.wMm ? "p" : "l";
  const pdf = new jsPDF({
    orientation,
    unit: "mm",
    format: [sizeMm.wMm, sizeMm.hMm],
  });

  const images: string[] = [];
  for (let i = 0; i < labels.length; i++) {
    if (token.cancelled) throw new ExportCancelled();
    const el = getElement(i);
    images.push(el ? (await captureLabel(el, size)).toDataURL("image/jpeg", 0.85) : "");
    onProgress(Math.round(((i + 1) / labels.length) * 90));
    await nextFrame();
  }

  if (token.cancelled) throw new ExportCancelled();
  const rendered = images.filter(Boolean).length;
  if (rendered === 0) throw new Error("Не удалось отрисовать ни одной наклейки — попробуйте ещё раз");
  onProgress(95);

  let added = 0;
  images.forEach((img) => {
    if (!img) return;
    if (added > 0) pdf.addPage([sizeMm.wMm, sizeMm.hMm], orientation);
    pdf.addImage(img, "JPEG", 0, 0, sizeMm.wMm, sizeMm.hMm);
    added++;
  });

  const fname = `nakleyki_4k_${Date.now()}.pdf`;
  pdf.save(fname);
  revealDownloaded(fname);
  onProgress(100);
}
