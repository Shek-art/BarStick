import { useRef, useState } from "react";
import Modal from "./Modal";
import type { LabelSettings, RowKey } from "../types";
import {
  DEFAULT_SETTINGS, MM_PRESETS, FONTS, BORDER_COLORS, HEADER_BGS, ROW_ORDER, ROW_TITLES,
} from "../lib/settings";
import { IconTrash, IconPlus, IconUpload, IconX } from "./icons";

interface Props {
  settings: LabelSettings;
  onChange: (patch: Partial<LabelSettings>) => void;
  onClose: () => void;
  onLogoFile: (file: File) => void;
  onResetAll: () => void;
  notify: (text: string, kind?: "success" | "error" | "info") => void;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="set-label">
      <span>{children}</span>
      <span className="flex-1 h-px bg-ink-200/70" />
    </div>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="flex items-center gap-2 cursor-pointer group"
    >
      <span className={`relative inline-flex h-[17px] w-[30px] rounded-full transition-colors duration-200 ${on ? "bg-moss-500" : "bg-ink-300"}`}>
        <span className={`absolute top-[2.5px] h-[12px] w-[12px] rounded-full bg-white shadow transition-all duration-200 ${on ? "left-[15px]" : "left-[2.5px]"}`} />
      </span>
      <span className={`text-[12px] font-semibold transition-colors ${on ? "text-moss-700" : "text-ink-500 group-hover:text-ink-700"}`}>
        {label}
      </span>
    </button>
  );
}

/** Окно настроек наклейки: логотип, размер (мм), шрифт, стиль, ячейки, свои графы */
export default function SettingsModal({ settings, onChange, onClose, onLogoFile, onResetAll, notify }: Props) {
  const [newFieldTitle, setNewFieldTitle] = useState("");
  const logoInput = useRef<HTMLInputElement>(null);
  const s = settings;

  const setRow = (key: RowKey, patch: Partial<{ visible: boolean; height: number }>) =>
    onChange({ rows: { ...s.rows, [key]: { ...s.rows[key], ...patch } } });

  const addCustomField = () => {
    const title = newFieldTitle.trim();
    if (!title) {
      notify("Введите название графы", "error");
      return;
    }
    const id = `cf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    onChange({ customFields: [...s.customFields, { id, title }] });
    setNewFieldTitle("");
    notify(`Графа «${title}» добавлена — заполните её в панели слева`, "success");
  };

  return (
    <Modal
      title="Настройки наклейки"
      subtitle="Все изменения применяются мгновенно и сохраняются автоматически"
      onClose={onClose}
      width={720}
      footer={
        <>
          <button
            className="px-3.5 py-2 rounded-lg border border-rust/40 text-rust text-[12px] font-bold hover:bg-rust/10 transition-colors cursor-pointer"
            onClick={() => { onResetAll(); notify("Настройки сброшены к стандартным", "info"); }}
          >
            Сбросить всё
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-moss-600 text-white text-[12px] font-bold hover:bg-moss-500 transition-colors cursor-pointer"
            onClick={onClose}
          >
            Готово
          </button>
        </>
      }
    >
      <div className="p-5 flex flex-col gap-6">
        {/* ── Логотип ── */}
        <section>
          <SectionLabel>Логотип поставщика</SectionLabel>
          <div className="flex items-center gap-4">
            <div className="w-[150px] h-[64px] shrink-0 rounded-lg border border-ink-200/70 bg-white flex items-center justify-center overflow-hidden">
              {s.showLogo ? (
                s.logo ? (
                  <img src={s.logo} alt="Логотип" className="max-w-[90%] max-h-[52px] object-contain" />
                ) : (
                  <span className="text-[11px] text-ink-300 italic">Стандартный «4K green»</span>
                )
              ) : (
                <span className="text-[11px] text-ink-300 italic">Скрыт</span>
              )}
            </div>
            <div className="flex-1 flex flex-col gap-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  ref={logoInput}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) onLogoFile(f);
                  }}
                />
                <button
                  className="flex items-center gap-1.5 rounded-lg border border-ink-200/80 bg-white px-3 py-1.5 text-[12px] font-bold text-ink-700 hover:border-moss-500 hover:text-moss-700 transition-colors cursor-pointer"
                  onClick={() => logoInput.current?.click()}
                >
                  <IconUpload size={13} /> Загрузить логотип
                </button>
                {s.logo && (
                  <button
                    className="flex items-center gap-1.5 rounded-lg border border-ink-200/80 bg-white px-3 py-1.5 text-[12px] font-bold text-ink-700 hover:border-rust hover:text-rust transition-colors cursor-pointer"
                    onClick={() => { onChange({ logo: null }); notify("Возвращён стандартный логотип", "info"); }}
                  >
                    <IconX size={13} /> Убрать свой
                  </button>
                )}
              </div>
              <Toggle on={s.showLogo} onChange={(v) => onChange({ showLogo: v })} label="Показывать логотип на наклейке" />
              <p className="text-[10.5px] text-ink-400">PNG/JPG/SVG до 2 МБ. Сохраняется вместе с настройками.</p>
            </div>
          </div>
        </section>

        {/* ── Размер ── */}
        <section>
          <SectionLabel>Размер наклейки, мм</SectionLabel>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {MM_PRESETS.map((p) => {
              const active = s.widthMm === p.w && s.heightMm === p.h;
              return (
                <button
                  key={p.label}
                  className={`preset-chip ${active ? "active" : ""}`}
                  onClick={() => { onChange({ widthMm: p.w, heightMm: p.h }); }}
                >
                  <span className="font-mono">{p.label} <span className="font-sans font-semibold text-[10px]">мм</span></span>
                  <small>{p.note}</small>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 text-[12px] font-semibold text-ink-600">
              Ширина
              <input
                type="number" min={20} max={150} step={1} value={s.widthMm}
                onChange={(e) => onChange({ widthMm: Math.min(150, Math.max(20, Math.round(Number(e.target.value) || 20))) })}
                className="set-input w-[86px]! font-mono"
              />
              мм
            </label>
            <label className="flex items-center gap-2 text-[12px] font-semibold text-ink-600">
              Высота
              <input
                type="number" min={30} max={200} step={1} value={s.heightMm}
                onChange={(e) => onChange({ heightMm: Math.min(200, Math.max(30, Math.round(Number(e.target.value) || 30))) })}
                className="set-input w-[86px]! font-mono"
              />
              мм
            </label>
            <span className="text-[10.5px] text-ink-400">10 px на 1 мм при экспорте и печати</span>
          </div>
        </section>

        {/* ── Шрифт ── */}
        <section>
          <SectionLabel>Шрифт и текст</SectionLabel>
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-2 text-[12px] font-semibold text-ink-600">
              Гарнитура
              <select
                className="set-input w-[190px]!"
                value={s.fontFamily}
                onChange={(e) => onChange({ fontFamily: e.target.value })}
              >
                {FONTS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </label>
            <label className="flex-1 min-w-[220px] flex items-center gap-3 text-[12px] font-semibold text-ink-600">
              Базовый размер
              <input
                type="range" min={10} max={19} step={0.5} value={s.fontSize}
                onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
                className="flex-1"
                style={{ accentColor: "#23a058" }}
              />
              <span className="font-mono text-[11px] font-bold text-ink-800 w-11 text-right">{s.fontSize}px</span>
            </label>
          </div>
          <p
            className="mt-2.5 rounded-lg border border-ink-200/70 bg-white px-3 py-2 text-ink-800"
            style={{ fontFamily: `'${s.fontFamily}', Arial, sans-serif`, fontSize: s.fontSize }}
          >
            Пример: Петля накладная GTV 35 мм — {s.fontSize}px
          </p>
        </section>

        {/* ── Стиль ── */}
        <section>
          <SectionLabel>Рамка и стиль</SectionLabel>
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[12px] font-semibold text-ink-600 w-[110px]">Цвет рамки</span>
              <div className="flex items-center gap-1.5">
                {BORDER_COLORS.map((c) => (
                  <button
                    key={c}
                    className={`swatch ${s.borderColor === c ? "active" : ""}`}
                    style={{ background: c }}
                    onClick={() => onChange({ borderColor: c })}
                    title={c}
                  />
                ))}
                <input
                  type="color"
                  value={s.borderColor}
                  onChange={(e) => onChange({ borderColor: e.target.value })}
                  className="w-[30px] h-[26px] rounded-md border border-ink-200/70 cursor-pointer bg-white p-0.5"
                  title="Свой цвет"
                />
              </div>
              <label className="flex items-center gap-2 text-[12px] font-semibold text-ink-600 ml-auto">
                Толщина
                <input
                  type="range" min={1} max={6} step={1} value={s.borderWidth}
                  onChange={(e) => onChange({ borderWidth: Number(e.target.value) })}
                  style={{ accentColor: "#23a058", width: 110 }}
                />
                <span className="font-mono text-[11px] font-bold text-ink-800 w-7">{s.borderWidth}px</span>
              </label>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[12px] font-semibold text-ink-600 w-[110px]">Фон «Поставщик»</span>
              <div className="flex items-center gap-1.5">
                {HEADER_BGS.map((c) => (
                  <button
                    key={c}
                    className={`swatch ${s.headerBg === c ? "active" : ""}`}
                    style={{ background: c, borderColor: s.headerBg === c ? "#23a058" : c === "#ffffff" ? "#d5d9d4" : undefined }}
                    onClick={() => onChange({ headerBg: c })}
                    title={c}
                  />
                ))}
              </div>
            </div>

            <Toggle on={s.zebra} onChange={(v) => onChange({ zebra: v })} label="Чередовать фон строк (зебра)" />
          </div>
        </section>

        {/* ── Ячейки ── */}
        <section>
          <SectionLabel>Ячейки: видимость и высота</SectionLabel>
          <div className="grid grid-cols-2 gap-x-5 gap-y-2">
            {ROW_ORDER.map((key) => (
              <div key={key} className="flex items-center gap-2.5 rounded-lg border border-ink-200/60 bg-white px-3 py-2">
                <input
                  type="checkbox"
                  checked={s.rows[key].visible}
                  onChange={(e) => setRow(key, { visible: e.target.checked })}
                  className="w-4 h-4 accent-[#23a058] cursor-pointer"
                />
                <span className={`flex-1 text-[12.5px] font-semibold ${s.rows[key].visible ? "text-ink-800" : "text-ink-300 line-through"}`}>
                  {ROW_TITLES[key]}
                </span>
                <input
                  type="number"
                  min={24} max={420}
                  value={s.rows[key].height}
                  disabled={!s.rows[key].visible}
                  onChange={(e) => setRow(key, { height: Math.min(420, Math.max(24, Number(e.target.value) || 24)) })}
                  className="set-input w-[74px]! py-1! font-mono text-[12px] disabled:opacity-40"
                />
                <span className="text-[10.5px] text-ink-400">px</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10.5px] text-ink-400">
            Фото товара всегда занимает оставшееся место внизу наклейки.
          </p>
        </section>

        {/* ── Свои графы ── */}
        <section>
          <SectionLabel>Свои графы</SectionLabel>
          <div className="flex items-center gap-2 mb-3">
            <input
              className="set-input flex-1"
              placeholder="Например: Партия / Срок годности / Цвет…"
              value={newFieldTitle}
              maxLength={40}
              onChange={(e) => setNewFieldTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustomField()}
            />
            <button
              className="flex items-center gap-1.5 shrink-0 rounded-lg bg-moss-600 text-white px-3.5 py-2 text-[12px] font-bold hover:bg-moss-500 transition-colors cursor-pointer"
              onClick={addCustomField}
            >
              <IconPlus size={13} /> Добавить
            </button>
          </div>

          {s.customFields.length === 0 ? (
            <p className="text-[11.5px] text-ink-400 italic">
              Пока нет своих граф. Добавьте — они появятся на наклейке между «Количеством» и «Штрих-кодом», а поля для значений — в панели слева.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {s.customFields.map((f) => (
                <div key={f.id} className="pop-in flex items-center gap-2.5 rounded-lg border border-moss-500/30 bg-moss-500/6 px-3 py-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-moss-500 shrink-0" />
                  <span className="flex-1 text-[12.5px] font-semibold text-ink-800 truncate">{f.title}</span>
                  <span className="text-[10px] font-mono text-ink-400">высота 40px</span>
                  <button
                    className="icon-btn danger"
                    title="Удалить графу"
                    onClick={() => {
                      onChange({ customFields: s.customFields.filter((x) => x.id !== f.id) });
                      notify(`Графа «${f.title}» удалена`, "info");
                    }}
                  >
                    <IconTrash size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="text-[10.5px] text-ink-400 border-t border-ink-200/60 pt-3 flex items-center gap-2">
          <span className="font-mono font-bold text-moss-600">i</span>
          Стандарт: {DEFAULT_SETTINGS.widthMm}×{DEFAULT_SETTINGS.heightMm} мм · {DEFAULT_SETTINGS.fontFamily} · рамка {DEFAULT_SETTINGS.borderWidth}px
        </p>
      </div>
    </Modal>
  );
}
