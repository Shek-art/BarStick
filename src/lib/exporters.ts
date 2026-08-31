import html2canvas from "html2canvas";
import JSZip from "jszip";
import { jsPDF } from "jspdf";
import type { LabelData } from "../types";

export const LABEL_W = 500;
export const LABEL_H = 850;

export function sanitizeFileName(s: string): string {
  return s.replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, 40) || "nkl";
}

async function captureLabel(el: HTMLElement): Promise<HTMLCanvasElement> {
  try {
    return await html2canvas(el, {
      scale: 1.5,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      logging: false,
      width: LABEL_W,
      height: LABEL_H,
    });
  } catch (err) {
    console.warn("Не удалось отрисовать наклейку, используется заглушка:", err);
    const canvas = document.createElement("canvas");
    canvas.width = LABEL_W * 1.5;
    canvas.height = LABEL_H * 1.5;
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

async function processInChunks<T>(
  items: T[],
  chunkSize: number,
  fn: (item: T, index: number) => Promise<void>,
  onProgress: (pct: number) => void
): Promise<void> {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    await Promise.all(chunk.map((item, j) => fn(item, i + j)));
    onProgress(Math.round(((i + chunk.length) / items.length) * 100));
  }
}

export async function exportZip(
  labels: LabelData[],
  getEl: (i: number) => HTMLElement | null,
  onProgress: (pct: number) => void
): Promise<void> {
  const zip = new JSZip();
  await processInChunks(
    labels,
    4,
    async (label, i) => {
      const el = getEl(i);
      if (!el) return;
      const canvas = await captureLabel(el);
      const base64 = canvas.toDataURL("image/jpeg", 0.88).split(",")[1];
      const file = `${label.uniqueIndex}-${label.copyIndex}_${sanitizeFileName(label.code)}.jpg`;
      zip.file(file, base64, { base64: true });
    },
    onProgress
  );
  const blob = await zip.generateAsync({ type: "blob" });
  triggerDownload(URL.createObjectURL(blob), `nakleyki_4k_${Date.now()}.zip`);
}

export async function exportPdf(
  labels: LabelData[],
  getEl: (i: number) => HTMLElement | null,
  onProgress: (pct: number) => void
): Promise<void> {
  const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [LABEL_W, LABEL_H], compress: true });
  const pages: string[] = [];
  await processInChunks(
    labels,
    4,
    async (_label, i) => {
      const el = getEl(i);
      if (!el) return;
      const canvas = await captureLabel(el);
      pages[i] = canvas.toDataURL("image/jpeg", 0.85);
    },
    onProgress
  );
  pages.forEach((img, i) => {
    if (i > 0) pdf.addPage([LABEL_W, LABEL_H], "portrait");
    if (img) pdf.addImage(img, "JPEG", 0, 0, LABEL_W, LABEL_H);
  });
  pdf.save(`nakleyki_4k_${Date.now()}.pdf`);
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 4000);
}
