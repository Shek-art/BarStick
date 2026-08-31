import type { LabelData } from "../types";
import { LABEL_W, LABEL_H } from "../lib/exporters";

/** Логотип поставщика (чистый HTML — гарантированно корректный рендер при экспорте) */
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

const LABEL_FONT = 'Arial, "Helvetica Neue", Helvetica, sans-serif';

interface RowProps {
  h: number;
  title: React.ReactNode;
  children: React.ReactNode;
  last?: boolean;
  bg?: string;
}

/** Строка таблицы наклейки: подпись слева (1/3), значение справа (2/3) */
function Row({ h, title, children, last, bg = "#ffffff" }: RowProps) {
  return (
    <div
      style={{ height: h, background: bg, borderBottom: last ? "none" : "2px solid #000" }}
      className="flex w-full"
    >
      <div
        className="flex items-center justify-center text-center leading-tight"
        style={{ width: "33.4%", borderRight: "2px solid #000", padding: "4px 6px", fontSize: 13.5, background: bg }}
      >
        {title}
      </div>
      <div className="flex items-center justify-center text-center overflow-hidden" style={{ width: "66.6%", padding: "4px 8px", background: bg }}>
        {children}
      </div>
    </div>
  );
}

/**
 * Печатная наклейка 500 × 850 px. Рендерится идентично в предпросмотре,
 * в скрытом экспортном слое и в зоне печати.
 */
export default function LabelSheet({ data }: { data: LabelData }) {
  return (
    <div
      style={{
        width: LABEL_W,
        height: LABEL_H,
        boxSizing: "border-box",
        border: "2px solid #000",
        background: "#fff",
        fontFamily: LABEL_FONT,
        color: "#000",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Поставщик */}
      <Row h={60} title="Поставщик" bg="#f2f7ec">
        <SupplierLogoHtml />
      </Row>

      {/* Наименование */}
      <Row h={70} title="Наименование товара">
        <span style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.25 }}>{data.name || "-"}</span>
      </Row>

      {/* Файл */}
      <Row h={40} title="Файл">
        <span style={{ fontSize: 12, color: "#444", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {data.file || "-"}
        </span>
      </Row>

      {/* Заказ */}
      <Row h={40} title="Заказ">
        <span style={{ fontSize: 12, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {data.order || "-"}
        </span>
      </Row>

      {/* Материал */}
      <Row h={40} title="Материал:">
        <span style={{ fontSize: 13.5, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {data.material || "-"}
        </span>
      </Row>

      {/* Код товара */}
      <Row h={50} title="Код товара">
        <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "0.06em" }}>{data.code || "-"}</span>
      </Row>

      {/* Количество */}
      <Row h={70} title={<>Количество штук<br />в упаковке</>}>
        <span style={{ fontSize: 31, fontWeight: 700, lineHeight: 1 }}>{data.quantity || "-"}</span>
      </Row>

      {/* Штрихкод */}
      <Row h={160} last title={<>Штрих код<br />EAN-13</>}>
        {data.barcodeImage ? (
          <img
            src={data.barcodeImage}
            alt="Штрихкод"
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
          />
        ) : data.barcodeState === "error" ? (
          <span style={{ fontSize: 12, color: "#c0392b", fontWeight: 700, padding: "0 8px" }}>
            Ошибка: некорректный EAN-13
          </span>
        ) : (
          <span style={{ fontSize: 12, color: "#999", fontStyle: "italic" }}>Штрихкод не задан</span>
        )}
      </Row>

      {/* Изображение товара */}
      <div className="flex items-center justify-center overflow-hidden" style={{ flex: 1, minHeight: 0, padding: 16, background: "#fff" }}>
        {data.image ? (
          <img
            src={data.image}
            alt="Товар"
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
          />
        ) : (
          <div
            className="flex items-center justify-center w-full h-full"
            style={{ border: "1.5px dashed #d8d8d8", color: "#bbb", fontSize: 13, fontStyle: "italic", background: "#fafafa" }}
          >
            Нет изображения
          </div>
        )}
      </div>
    </div>
  );
}
