const MAX_SIDE = 1600;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("bad image"));
    img.src = url;
  });
}

/**
 * Файл фото товара → dataURL (сохраняется в localStorage и переживает перезапуск).
 * Вертикальные снимки автоматически поворачиваются в альбомную ориентацию;
 * очень большие фото уменьшаются до 1600 px по длинной стороне.
 */
export async function processImageFile(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const portrait = img.naturalHeight > img.naturalWidth;
    const longSide = Math.max(img.naturalWidth, img.naturalHeight);
    const k = longSide > MAX_SIDE ? MAX_SIDE / longSide : 1;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return url;

    if (portrait) {
      canvas.width = Math.round(img.naturalHeight * k);
      canvas.height = Math.round(img.naturalWidth * k);
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.drawImage(img, (-img.naturalWidth * k) / 2, (-img.naturalHeight * k) / 2, img.naturalWidth * k, img.naturalHeight * k);
    } else {
      canvas.width = Math.round(img.naturalWidth * k);
      canvas.height = Math.round(img.naturalHeight * k);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }
    return canvas.toDataURL("image/jpeg", 0.88);
  } catch {
    return url;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Файл → dataURL без изменений (штрихкоды, логотип: важна чёткость) */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.readAsDataURL(file);
  });
}
