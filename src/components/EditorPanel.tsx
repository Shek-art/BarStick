import type { CustomField, FieldKey, FieldsState, SameFlags } from "../types";
import Dropzone from "./Dropzone";
import { IconImage } from "./icons";

interface Props {
  fields: FieldsState;
  customValues: Record<string, string>;
  customFields: CustomField[];
  same: SameFlags;
  images: string[];
  barcodeUploads: string[];
  onField: (key: FieldKey, value: string) => void;
  onCustomValue: (id: string, value: string) => void;
  onSame: (key: keyof SameFlags, value: boolean) => void;
  onAddImages: (files: File[]) => void;
  onAddBarcodes: (files: File[]) => void;
  onViewImages: () => void;
  onViewBarcodes: () => void;
}

const LINE_FIELDS: { key: FieldKey; label: string; same?: keyof SameFlags }[] = [
  { key: "name", label: "Наименование товара" },
  { key: "file", label: "Файл" },
  { key: "order", label: "Заказ", same: "order" },
  { key: "material", label: "Материал", same: "material" },
  { key: "code", label: "Код товара" },
  { key: "quantity", label: "Кол-во шт в упаковке", same: "quantity" },
  { key: "barcode", label: "Штрих-код EAN-13" },
];

function countLines(text: string): number {
  return text.split("\n").map((s) => s.trim()).filter(Boolean).length;
}

function SameSwitch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`flex items-center gap-1.5 shrink-0 text-[10.5px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
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
  fields, customValues, customFields, same, images, barcodeUploads,
  onField, onCustomValue, onSame, onAddImages, onAddBarcodes, onViewImages, onViewBarcodes,
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
                  <label className="flex items-center gap-2 min-w-0 text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-500">
                    <span className="truncate">{label}</span>
                    {lines > 0 && (
                      <span key={lines} className="pop-in inline-flex items-center whitespace-nowrap shrink-0 font-mono text-[10px] font-bold text-moss-700 bg-moss-500/12 border border-moss-500/25 rounded-full px-1.5 py-px">
                        {lines}&nbsp;шт
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

      {/* Свои графы (из настроек) */}
      {customFields.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-moss-700">
              Свои графы
            </h2>
            <span className="text-[10.5px] text-ink-300 font-medium">{customFields.length} шт</span>
          </div>
          <div className="flex flex-col gap-3">
            {customFields.map((f) => (
              <div key={f.id} className="pop-in">
                <label className="block mb-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-moss-700">
                  {f.title}
                </label>
                <textarea
                  className="field-area"
                  rows={2}
                  value={customValues[f.id] ?? ""}
                  onChange={(e) => onCustomValue(f.id, e.target.value)}
                  placeholder="Значения по строкам…"
                  spellCheck={false}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Тираж */}
      <section className="rounded-xl border border-sky-info/30 bg-sky-info/6 p-3">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-sky-info">
            Кол-во наклеек (тираж)
          </label>
          <span className="text-[10.5px] text-sky-info/70 font-medium">по строкам</span>
        </div>
        <textarea
          className="field-area font-mono text-[12.5px]!"
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
      <section className="flex flex-col gap-3 pt-1 border-t border-ink-200/50">
        <div className="pt-3">
          <Dropzone
            title="Штрихкоды (картинки)"
            hint="Готовые штрихкоды · порядок = наклейкам"
            count={barcodeUploads.length}
            onFiles={onAddBarcodes}
            onView={onViewBarcodes}
          />
        </div>

        <Dropzone
          title="Фото товара"
          hint="Перетащите фото или нажмите"
          count={images.length}
          onFiles={onAddImages}
          onView={onViewImages}
        />

        <p className="text-[10.5px] leading-snug text-ink-300 flex items-start gap-1.5">
          <IconImage size={12} className="mt-px shrink-0" />
          Вертикальные фото автоматически поворачиваются в альбомную ориентацию.
          Кнопка «Просмотр» — замена, удаление и порядок в списке.
        </p>
      </section>
    </div>
  );
}
