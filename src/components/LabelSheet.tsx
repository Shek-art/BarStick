import { useLayoutEffect, useRef } from "react";
import type { LabelData, LabelSettings, RowKey } from "../types";
import { isDarkColor } from "../lib/settings";

interface FitTextProps {
  text: string;
  baseSize: number;
  maxHeight: number;
  weight?: number;
  letterSpacing?: string;
  color?: string;
  lineHeight?: number;
  fontFamily?: string;
  /** Всегда в одну строку: перенос запрещён, кегль уменьшается по ширине */
  nowrap?: boolean;
}

/**
 * Текст ячейки наклейки с гарантированным переносом строк:
 * 1) длинные слова и строки без пробелов разбиваются (overflow-wrap);
 * 2) если перенесённый текст всё равно выше ячейки — кегль автоматически
 *    уменьшается (бинарный поиск), пока всё содержимое не станет видимым.
 */
function FitText({ text, baseSize, maxHeight, weight = 400, letterSpacing, color, lineHeight = 1.22, fontFamily, nowrap }: FitTextProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fits = () =>
      el.scrollHeight <= maxHeight + 1 && (!nowrap || el.scrollWidth <= el.clientWidth + 1);

    const MIN = 7.5;
    let lo = MIN;
    let hi = baseSize;
    el.style.fontSize = `${hi}px`;
    if (fits()) return; // помещается сразу

    while (hi - lo > 0.4) {
      const mid = (lo + hi) / 2;
      el.style.fontSize = `${mid}px`;
      if (fits()) lo = mid;
      else hi = mid;
    }
    el.style.fontSize = `${lo}px`;
  }, [text, baseSize, maxHeight, lineHeight, fontFamily, nowrap]);

  return (
    <span
      ref={ref}
      style={
        nowrap
          ? {
              display: "block",
              width: "100%",
              whiteSpace: "nowrap",
              textAlign: "center",
              overflow: "hidden",
              fontWeight: weight,
              letterSpacing,
              color,
              lineHeight,
            }
          : {
              display: "block",
              maxWidth: "100%",
              textAlign: "center",
              overflowWrap: "anywhere",
              wordBreak: "break-word",
              fontWeight: weight,
              letterSpacing,
              color,
              lineHeight,
            }
      }
    >
      {text}
    </span>
  );
}

/** Логотип поставщика по умолчанию (чистый HTML — надёжный рендер при экспорте) */
function SupplierLogoHtml() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          width: 34, height: 34, borderRadius: 8, background: "#1E7A48",
          color: "#fff", fontFamily: "Arial Black, Arial, sans-serif", fontWeight: 900,
          fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        4K
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
        <span style={{ fontFamily: "Arial, sans-serif", fontWeight: 700, fontSize: 19, color: "#1E7A48", lineHeight: 1.05 }}>
          green
        </span>
        <span style={{ width: 52, height: 3.5, borderRadius: 2, background: "#3ECF7A", marginTop: 2 }} />
      </div>
    </div>
  );
}

interface RowDef {
  key: string;
  h: number;
  bg: string;
  titleColor: string;
  title: React.ReactNode;
  value: React.ReactNode;
}

/**
 * Печатная наклейка. Все параметры (размер, шрифт, ячейки, цвета, графы)
 * управляются настройками. Рендер идентичен в предпросмотре, экспорте и печати.
 */
export default function LabelSheet({ data, settings }: { data: LabelData; settings: LabelSettings }) {
  const fs = settings.fontSize;
  const bw = settings.borderWidth;
  const bc = settings.borderColor;
  const headerDark = isDarkColor(settings.headerBg);
  const headerText = headerDark ? "#ffffff" : "#000000";
  const R = settings.rows;
  const ff = settings.fontFamily;

  /* ── Формируем список видимых ячеек ── */
  const rows: RowDef[] = [];
  let zebraTick = 0;
  const bodyBg = () => {
    if (!settings.zebra) return "#ffffff";
    zebraTick += 1;
    return zebraTick % 2 === 0 ? "#f3f4f0" : "#ffffff";
  };

  const add = (key: RowKey, title: React.ReactNode, value: React.ReactNode) => {
    if (!R[key].visible) return;
    rows.push({
      key,
      h: R[key].height,
      bg: key === "supplier" ? settings.headerBg : bodyBg(),
      titleColor: key === "supplier" ? headerText : "#000000",
      title,
      value,
    });
  };

  add("supplier", "Поставщик",
    settings.showLogo
      ? settings.logo
        ? <img src={settings.logo} alt="Логотип" style={{ maxHeight: Math.max(16, R.supplier.height - 16), maxWidth: "92%", objectFit: "contain" }} />
        : <SupplierLogoHtml />
      : <span style={{ color: "#bbb", fontSize: fs }}>—</span>
  );

  add("name", "Наименование товара",
    <FitText text={data.name || "-"} baseSize={fs} maxHeight={R.name.height - 8} weight={600} lineHeight={1.25} fontFamily={ff} />
  );

  add("file", "Файл",
    <FitText text={data.file || "-"} baseSize={fs * 0.88} maxHeight={R.file.height - 8} color="#444" fontFamily={ff} />
  );

  add("order", "Заказ",
    <FitText text={data.order || "-"} baseSize={fs * 0.88} maxHeight={R.order.height - 8} fontFamily={ff} />
  );

  add("material", "Материал:",
    <FitText text={data.material || "-"} baseSize={fs} maxHeight={R.material.height - 8} fontFamily={ff} />
  );

  add("code", "Код товара",
    <FitText text={data.code || "-"} baseSize={fs * 1.18} maxHeight={R.code.height - 8} weight={700} letterSpacing="0.06em" fontFamily={ff} />
  );

  add("quantity", <>Количество штук<br />в упаковке</>,
    <FitText text={data.quantity || "-"} baseSize={fs * 2.3} maxHeight={R.quantity.height - 8} weight={700} lineHeight={1} nowrap fontFamily={ff} />
  );

  /* Свои графы — между количеством и штрихкодом */
  for (const f of settings.customFields) {
    rows.push({
      key: `cf-${f.id}`,
      h: 40,
      bg: settings.zebra ? bodyBg() : "#ffffff",
      titleColor: "#000000",
      title: f.title,
      value: <FitText text={data.custom[f.id] || "-"} baseSize={fs * 0.92} maxHeight={32} fontFamily={ff} />,
    });
  }

  add("barcode", <>Штрих код<br />EAN-13</>,
    data.barcodeImage ? (
      <img src={data.barcodeImage} alt="Штрихкод" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
    ) : data.barcodeState === "error" ? (
      <span style={{ fontSize: fs * 0.85, color: "#c0392b", fontWeight: 700, padding: "0 8px" }}>
        Ошибка: некорректный EAN-13
      </span>
    ) : (
      <span style={{ fontSize: fs * 0.85, color: "#999", fontStyle: "italic" }}>Штрихкод не задан</span>
    )
  );

  return (
    <div
      style={{
        width: settings.width,
        height: settings.height,
        boxSizing: "border-box",
        border: `${bw}px solid ${bc}`,
        background: "#fff",
        fontFamily: `'${settings.fontFamily}', Arial, sans-serif`,
        color: "#000",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {rows.map((row) => (
        <div
          key={row.key}
          style={{
            height: row.h,
            background: row.bg,
            borderBottom: `${bw}px solid ${bc}`,
          }}
          className="flex w-full shrink-0"
        >
          <div
            className="flex items-center justify-center text-center"
            style={{
              width: "33.4%",
              borderRight: `${bw}px solid ${bc}`,
              padding: "4px 6px",
              fontSize: fs,
              lineHeight: 1.2,
              color: row.titleColor,
              background: row.bg,
              overflowWrap: "anywhere",
              wordBreak: "break-word",
              minWidth: 0,
            }}
          >
            {row.title}
          </div>
          <div
            className="flex items-center justify-center overflow-hidden"
            style={{ flex: 1, padding: "4px 8px", background: row.bg }}
          >
            {row.value}
          </div>
        </div>
      ))}

      {/* Изображение товара — оставшееся место */}
      <div
        className="flex items-center justify-center overflow-hidden"
        style={{ flex: 1, minHeight: 0, padding: Math.max(8, fs), background: "#fff" }}
      >
        {data.image ? (
          <img src={data.image} alt="Товар" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
        ) : (
          <div
            className="flex items-center justify-center w-full h-full"
            style={{
              border: "1.5px dashed #d8d8d8", color: "#bbb",
              fontSize: fs * 0.95, fontStyle: "italic", background: "#fafafa",
            }}
          >
            Нет изображения
          </div>
        )}
      </div>
    </div>
  );
}
