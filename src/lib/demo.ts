import type { FieldsState } from "../types";

/** Автономные демо-изображения (SVG dataURL — работают офлайн и в экспорте без CORS) */
function productSvg(label: string, accent: string, glyph: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
<rect width="640" height="480" fill="#ffffff"/>
<circle cx="320" cy="205" r="118" fill="${accent}" opacity="0.14"/>
<circle cx="320" cy="205" r="86" fill="${accent}" opacity="0.22"/>
<text x="320" y="235" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="86" fill="${accent}">${glyph}</text>
<text x="320" y="392" text-anchor="middle" font-family="Arial, sans-serif" font-weight="600" font-size="26" fill="#3a4740">${label}</text>
<rect x="150" y="420" width="340" height="6" rx="3" fill="${accent}" opacity="0.35"/>
</svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

export const DEMO_IMAGES = [
  productSvg("Петля мебельная GTV", "#1e7a48", "⌗"),
  productSvg("Ручка-скоба Boyard", "#14213d", "⊞"),
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

/** Демо-изображения уже автономны (dataURL) — просто возвращаем их */
export async function resolveDemoImages(): Promise<string[]> {
  return DEMO_IMAGES;
}
