import JSZip from "jszip";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import type { LabelData } from "../types";

export interface ExportSize {
  w: number;
  h: number;
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

async function captureLabel(el: HTMLElement, size: ExportSize): Promise<HTMLCanvasElement> {
  try {
    return await html2canvas(el, {
      scale: 1.5,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      logging: false,
      width: size.w,
      height: size.h,
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

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
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

  for (let i = 0; i < labels.length; i++) {
    if (token.cancelled) throw new ExportCancelled();
    const el = getElement(i);
    if (el) {
      const canvas = await captureLabel(el, size);
      const data = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
      zip.file(`${stickerFileName(labels[i])}.jpg`, data, { base64: true });
    }
    onProgress(Math.round(((i + 1) / labels.length) * 92));
    await nextFrame();
  }

  if (token.cancelled) throw new ExportCancelled();
  onProgress(96);
  const blob = await zip.generateAsync({ type: "blob" });
  triggerDownload(blob, `nakleyki_4k_${Date.now()}.zip`);
  onProgress(100);
}

/** Экспорт всех наклеек в PDF (одна наклейка = одна страница) */
export async function exportPdf(
  labels: LabelData[],
  getElement: (i: number) => HTMLElement | null,
  size: ExportSize,
  onProgress: (pct: number) => void,
  token: CancelToken
): Promise<void> {
  const orientation = size.h >= size.w ? "p" : "l";
  const pdf = new jsPDF({
    orientation,
    unit: "px",
    format: [size.w, size.h],
    hotfixes: ["px_scaling"],
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
  onProgress(95);

  images.forEach((img, i) => {
    if (!img) return;
    if (i > 0) pdf.addPage([size.w, size.h], orientation);
    pdf.addImage(img, "JPEG", 0, 0, size.w, size.h);
  });

  pdf.save(`nakleyki_4k_${Date.now()}.pdf`);
  onProgress(100);
}
