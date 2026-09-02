/**
 * Файл изображения → URL для отображения.
 * Вертикальные фото автоматически поворачиваются в альбомную ориентацию
 * (с сохранением в dataURL — переживает обновление страницы).
 */
export function processImageFile(file: File): Promise<string> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (img.naturalHeight > img.naturalWidth) {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalHeight;
        canvas.height = img.naturalWidth;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate(-Math.PI / 2);
          ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
          const out = canvas.toDataURL("image/png");
          URL.revokeObjectURL(url);
          resolve(out);
          return;
        }
      }
      resolve(url);
    };
    img.onerror = () => resolve(url);
    img.src = url;
  });
}

/** Файл → dataURL (для логотипа: сохраняется в localStorage) */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.readAsDataURL(file);
  });
}
