import type { FieldKey, FieldsState, SameFlags } from "../types";
import Dropzone from "./Dropzone";
import { IconBarcode, IconImage, IconX } from "./icons";

interface Props {
  fields: FieldsState;
  same: SameFlags;
  images: string[];
  barcodeUploads: string[];
  onField: (key: FieldKey, value: string) => void;
  onSame: (key: keyof SameFlags, value: boolean) => void;
  onAddImages: (files: File[]) => void;
  onRemoveImage: (i: number) => void;
  onAddBarcodes: (files: File[]) => void;
  onRemoveBarcode: (i: number) => void;
}

const LINE_FIELDS: { key: FieldKey; label: string; placeholder?: string; same?: keyof SameFlags }[] = [
  { key: "name", label: "Наименование товара" },
  { key: "file", label: "Файл" },
  { key: "order", label: "Заказ", same: "order" },
  { key: "material", label: "Материал", same: "material" },
  { key: "code", label: "Код товара" },
  { key: "quantity", label: "Кол-во шт в упаковке", same: "quantity" },
  { key: "barcode", label: "Штрих-код EAN-13" },
];

export function countLines(text: string): number {
  const lines = text.split("\n").map((s) => s.trim()).filter(Boolean);
  return lines.length;
}

function SameSwitch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
        on ? "text-moss-600" : "text-ink-300 hover:text-ink-500"
      }`}
      title="Применить первую строку ко всем наклейкам"
    >
      <span
        className={`relative inline-flex h-[15px] w-[27px] rounded-full transition-colors duration-200 ${
          on ? "bg-moss-500" : "bg-ink-200"
        }`}
      >
        <span
          className={`absolute top-[2px] h-[11px] w-[11px] rounded-full bg-white shadow transition-all duration-200 ${
            on ? "left-[14px]" : "left-[2px]"
          }`}
        />
      </span>
      одинаковые
    </button>
  );
}

export default function EditorPanel({
  fields, same, images, barcodeUploads,
  onField, onSame, onAddImages, onRemoveImage, onAddBarcodes, onRemoveBarcode,
}: Props) {
  return (
    <div className="flex flex-col gap-4">
      {/* Поля */}
      <section>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-ink-800">
            Поля наклейки
          </h2>
          <span className="text-[10.5px] text-ink-300 font-medium">строка = наклейка</span>
        </div>

        <div className="flex flex-col gap-3">
          {LINE_FIELDS.map(({ key, label, same: sameKey }) => {
            const lines = countLines(fields[key]);
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <label className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-500">
                    {label}
                    {lines > 0 && (
                      <span key={lines} className="pop-in font-mono text-[10px] font-bold text-moss-700 bg-moss-500/12 border border-moss-500/25 rounded-full px-1.5 py-px leading-tight">
                        {lines} шт
                      </span>
                    )}
                  </label>
                  {sameKey && <SameSwitch on={same[sameKey]} onChange={(v) => onSame(sameKey, v)} />}
                </div>
                <textarea
                  className="field-area"
                  rows={key === "name" ? 3 : 2}
                  value={fields[key]}
                  onChange={(e) => onField(key, e.target.value)}
                  placeholder={key === "barcode" ? "4600000000008" : key === "code" ? "АРТ-001" : ""}
                  spellCheck={false}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Тираж */}
      <section className="rounded-xl border border-sky-info/30 bg-sky-info/6 p-3">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-sky-info">
            Кол-во наклеек (тираж)
          </label>
          <span className="text-[10.5px] text-sky-info/70 font-medium">по строкам</span>
        </div>
        <textarea
          className="field-area"
          rows={2}
          value={fields.copies}
          onChange={(e) => onField("copies", e.target.value)}
          placeholder={"2\n1"}
          spellCheck={false}
        />
        <p className="mt-1.5 text-[10.5px] leading-snug text-sky-info/80">
          Сколько копий печатать для каждой позиции. Пусто — по одной.
        </p>
      </section>

      {/* Загрузки */}
      <section className="flex flex-col gap-4 pt-1 border-t border-ink-200/50">
        <div className="pt-3 flex flex-col gap-3">
          <Dropzone
            title="Штрихкоды (картинки)"
            hint="Загрузить готовые штрихкоды"
            countText={barcodeUploads.length ? `${barcodeUploads.length} шт` : null}
            onFiles={onAddBarcodes}
          />
          {barcodeUploads.length > 0 && (
            <div className="flex flex-wrap gap-1.5 -mt-1">
              {barcodeUploads.map((src, i) => (
                <span key={i} className="pop-in group relative flex items-center gap-1.5 border border-ink-200/70 bg-paper rounded-lg pl-1.5 pr-1 py-1">
                  <IconBarcode size={13} className="text-ink-500" />
                  <span className="text-[10.5px] font-bold text-ink-600 font-mono">ШК-{i + 1}</span>
                  <img src={src} alt="" className="h-5 w-9 object-contain bg-white rounded-sm border border-ink-200/50" />
                  <button
                    onClick={() => onRemoveBarcode(i)}
                    className="cursor-pointer rounded p-0.5 text-ink-300 hover:text-rust hover:bg-rust/10 transition-colors"
                    title="Удалить"
                  >
                    <IconX size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <Dropzone
            title="Фото товара"
            hint="Перетащите фото или нажмите"
            countText={images.length ? `${images.length} шт` : null}
            onFiles={onAddImages}
          />
          {images.length > 0 && (
            <div className="grid grid-cols-4 gap-1.5 -mt-1">
              {images.map((src, i) => (
                <div key={i} className="pop-in group relative aspect-square rounded-lg overflow-hidden border border-ink-200/70 bg-white">
                  <img src={src} alt={`Фото ${i + 1}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                  <span className="absolute bottom-0.5 left-0.5 font-mono text-[9px] font-bold bg-ink-900/80 text-lime-glow rounded px-1 leading-tight">
                    {i + 1}
                  </span>
                  <button
                    onClick={() => onRemoveImage(i)}
                    className="absolute top-0.5 right-0.5 cursor-pointer rounded-md bg-ink-900/70 p-1 text-white opacity-0 group-hover:opacity-100 hover:bg-rust transition-all"
                    title="Удалить фото"
                  >
                    <IconX size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-[10.5px] leading-snug text-ink-300 -mt-1 flex items-start gap-1.5">
            <IconImage size={12} className="mt-px shrink-0" />
            Вертикальные фото автоматически поворачиваются в альбомную ориентацию.
          </p>
        </div>
      </section>
    </div>
  );
}
