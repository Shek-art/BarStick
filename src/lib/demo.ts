import type { FieldsState } from "../types";

export const DEMO_IMAGES = [
  "https://image.qwenlm.ai/generated-images/1a75d9d6-b449-44a4-8a2e-d09840074382/_result.png",
  "https://image.qwenlm.ai/generated-images/05d9090a-4bf6-4670-8ecf-85216a18cc0a/_result.png",
];

export const DEMO_FIELDS: FieldsState = {
  name: "Петля накладная GTV 35 мм с доводчиком\nРучка-скоба Boyard 128 мм, чёрная",
  file: "katalog_furnitura_2026.xlsx\nkatalog_furnitura_2026.xlsx",
  order: "ЗК-1042 от 12.02.2026",
  material: "Сталь / никель",
  code: "GTV-PN-35-D\nBYD-RS-128-B",
  quantity: "100\n50",
  barcode: "4600000000008\n5901234123457",
  copies: "2\n1",
};

/**
 * Переводит внешние демо-изображения в dataURL, чтобы экспорт
 * (SVG foreignObject) не зависел от CORS внешних хостов.
 * При неудаче возвращает исходный URL.
 */
export async function resolveDemoImages(): Promise<string[]> {
  return Promise.all(
    DEMO_IMAGES.map(async (url) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return url;
        const blob = await res.blob();
        return await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => resolve(url);
          reader.readAsDataURL(blob);
        });
      } catch {
        return url;
      }
    })
  );
}
