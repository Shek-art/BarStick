import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  FieldKey, FieldsState, LabelData, MediaKind, SameFlags,
  ToastItem, ToastKind, ExportProgress,
} from "./types";
import { normalizeEan13, generateBarcodeDataUrl } from "./lib/barcode";
import { exportZip, exportPdf, ExportCancelled, type CancelToken } from "./lib/exporters";
import { loadSettings, saveSettings, DEFAULT_SETTINGS, labelPx } from "./lib/settings";
import { processImageFile, fileToDataUrl } from "./lib/images";
import { DEMO_FIELDS, resolveDemoImages } from "./lib/demo";
import { isElectron } from "./lib/electronBridge";
import LabelSheet from "./components/LabelSheet";
import Workspace from "./components/Workspace";
import EditorPanel from "./components/EditorPanel";
import SettingsModal from "./components/SettingsModal";
import MediaModal from "./components/MediaModal";
import Lightbox from "./components/Lightbox";
import ListChecker from "./components/ListChecker";
import { TitleBar, StatusBar, Toasts } from "./components/Chrome";
import {
  IconPdf, IconZip, IconReset, IconSpark, IconSettings, IconX,
  IconTag, IconClipboardCheck,
} from "./components/icons";

type Tab = "labels" | "checker";

const K_FIELDS = "nkl4k:fields";
const K_SAME = "nkl4k:same";
const K_ZOOM = "nkl4k:zoom";
const K_CUSTOM = "nkl4k:custom";
const K_IMAGES = "nkl4k:images";
const K_BARCODES = "nkl4k:barcodes";

const EMPTY_FIELDS: FieldsState = {
  name: "", file: "", order: "", material: "", code: "", quantity: "", barcode: "", copies: "",
};

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Из хранилища берём только dataURL (старые blob: ссылки не переживают перезапуск) */
function loadMedia(key: string): string[] {
  const arr = loadJSON<string[]>(key, []);
  return Array.isArray(arr) ? arr.filter((x) => typeof x === "string" && x.startsWith("data:")) : [];
}

function TabBtn({ active, onClick, icon, label, badge }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string; badge?: number;
}) {
  return (
    <button className={`tab-btn ${active ? "active" : ""}`} onClick={onClick} title={label}>
      {icon}
      {label}
      {badge !== undefined && badge > 0 && (
        <span className={`font-mono text-[10px] font-bold rounded-full px-1.5 py-px leading-tight border ${
          active ? "bg-lime-glow/15 text-lime-glow border-lime-glow/30" : "bg-white/8 text-ink-300 border-white/10"
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
}

export default function App() {
  /* ── Состояние модуля наклеек ── */
  const [fields, setFields] = useState<FieldsState>(() => loadJSON(K_FIELDS, EMPTY_FIELDS));
  const [same, setSame] = useState<SameFlags>(() => loadJSON(K_SAME, { order: false, material: false, quantity: false }));
  const [customValues, setCustomValues] = useState<Record<string, string>>(() => loadJSON(K_CUSTOM, {}));
  const [images, setImages] = useState<string[]>(() => loadMedia(K_IMAGES));
  const [barcodeUploads, setBarcodeUploads] = useState<string[]>(() => loadMedia(K_BARCODES));
  const [settings, setSettings] = useState(loadSettings);
  const [zoom, setZoom] = useState<number>(() => {
    const z = Number(localStorage.getItem(K_ZOOM));
    return z > 0 ? z : 0.55;
  });

  /* ── Вкладки ── */
  const [tab, setTab] = useState<Tab>(() => {
    const t = localStorage.getItem("nkl4k:tab");
    return t === "checker" ? "checker" : "labels";
  });
  const [checkerStats, setCheckerStats] = useState<{ lists: number; lines: number; passed: boolean | null }>({
    lists: 0, lines: 0, passed: null,
  });

  /* ── UI-состояние ── */
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [exporting, setExporting] = useState<ExportProgress | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mediaModal, setMediaModal] = useState<MediaKind | null>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const toastId = useRef(0);
  const firstSave = useRef(true);
  const quotaWarned = useRef(false);
  const cancelRef = useRef<CancelToken | null>(null);
  const exportLayerRef = useRef<HTMLDivElement>(null);

  const toast = useCallback((text: string, kind: ToastKind = "info") => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev.slice(-3), { id, kind, text }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4200);
  }, []);

  /* ── Автосохранение полей и настроек ── */
  useEffect(() => {
    if (firstSave.current) { firstSave.current = false; return; }
    setSaveState("saving");
    const t = setTimeout(() => {
      try {
        localStorage.setItem(K_FIELDS, JSON.stringify(fields));
        localStorage.setItem(K_SAME, JSON.stringify(same));
        localStorage.setItem(K_ZOOM, String(zoom));
        localStorage.setItem(K_CUSTOM, JSON.stringify(customValues));
      } catch { /* переполнение хранилища не критично */ }
      setSaveState("saved");
    }, 450);
    return () => clearTimeout(t);
  }, [fields, same, zoom, customValues]);

  useEffect(() => { saveSettings(settings); }, [settings]);
  useEffect(() => { localStorage.setItem("nkl4k:tab", tab); }, [tab]);

  /* ── Сохранение загруженных фото и штрихкодов (переживает перезапуск) ── */
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(K_IMAGES, JSON.stringify(images));
        localStorage.setItem(K_BARCODES, JSON.stringify(barcodeUploads));
      } catch {
        if (!quotaWarned.current) {
          quotaWarned.current = true;
          toast("Хранилище переполнено — медиафайлы не будут сохраняться между запусками", "error");
        }
      }
    }, 600);
    return () => clearTimeout(t);
  }, [images, barcodeUploads, toast]);

  /* ── Сборка наклеек из полей ── */
  const labels = useMemo<LabelData[]>(() => {
    const split = (t: string) => t.split("\n").map((s) => s.trim());
    const n = split(fields.name), f = split(fields.file), o = split(fields.order),
      m = split(fields.material), c = split(fields.code), q = split(fields.quantity),
      b = split(fields.barcode), pc = split(fields.copies);

    const baseLen = Math.max(n.length, f.length, o.length, m.length, c.length, q.length, b.length, images.length);
    if (baseLen === 0) return [];

    const result: LabelData[] = [];
    for (let i = 0; i < baseLen; i++) {
      const count = Math.max(1, parseInt(pc[i], 10) || 1);
      const nb = normalizeEan13(b[i] ?? "");
      const custom: Record<string, string> = {};
      for (const cf of settings.customFields) {
        const lines = split(customValues[cf.id] ?? "");
        custom[cf.id] = lines[i] ?? "";
      }
      const base: LabelData = {
        name: n[i] ?? "",
        file: f[i] ?? "",
        order: same.order ? (o[0] ?? "") : (o[i] ?? ""),
        material: same.material ? (m[0] ?? "") : (m[i] ?? ""),
        code: c[i] ?? "",
        quantity: same.quantity ? (q[0] ?? "") : (q[i] ?? ""),
        barcodeText: nb.digits ?? "",
        barcodeState: nb.state === "empty" ? "none" : nb.state,
        barcodeImage: barcodeUploads[i] ?? (nb.digits ? generateBarcodeDataUrl(nb.digits) : null),
        image: images[i] ?? null,
        uniqueIndex: i + 1,
        copyIndex: 1,
        totalCopies: count,
        custom,
      };
      for (let j = 0; j < count; j++) result.push({ ...base, copyIndex: j + 1 });
    }
    return result;
  }, [fields, same, images, barcodeUploads, customValues, settings.customFields]);

  const uniqueCount = labels.length ? labels[labels.length - 1].uniqueIndex : 0;

  /* ── Медиа ── */
  const handleAddImages = useCallback(async (files: File[]) => {
    const processed = await Promise.all(files.map(processImageFile));
    setImages((prev) => [...prev, ...processed]);
    toast(`Добавлено фото: ${processed.length}`, "success");
  }, [toast]);

  const handleAddBarcodes = useCallback(async (files: File[]) => {
    const urls = await Promise.all(files.map(fileToDataUrl));
    setBarcodeUploads((prev) => [...prev, ...urls]);
    toast(`Добавлено штрихкодов: ${urls.length}`, "success");
  }, [toast]);

  const handleReplaceImage = useCallback(async (i: number, file: File) => {
    const url = await processImageFile(file);
    setImages((prev) => prev.map((x, j) => (j === i ? url : x)));
    toast(`Фото ${i + 1} заменено`, "success");
  }, [toast]);

  const handleReplaceBarcode = useCallback(async (i: number, file: File) => {
    const url = await fileToDataUrl(file);
    setBarcodeUploads((prev) => prev.map((x, j) => (j === i ? url : x)));
    toast(`Штрихкод ${i + 1} заменён`, "success");
  }, [toast]);

  const move = <T,>(arr: T[], i: number, dir: -1 | 1): T[] => {
    const j = i + dir;
    if (j < 0 || j >= arr.length) return arr;
    const copy = [...arr];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    return copy;
  };

  /* ── Экспорт ── */
  const getExportEl = useCallback(
    (i: number) =>
      exportLayerRef.current?.querySelector<HTMLElement>(`[data-label-index="${i}"]`) ?? null,
    []
  );

  const runExport = useCallback(
    async (kind: "zip" | "pdf") => {
      if (labels.length === 0 || exporting) return;
      const token: CancelToken = { cancelled: false };
      cancelRef.current = token;
      setExporting({ pct: 0, label: kind === "zip" ? "Рендер JPG" : "Рендер страниц" });
      const sizePx = labelPx(settings);
      const sizeMm = { wMm: settings.widthMm, hMm: settings.heightMm };
      try {
        /* Двойной rAF: экспортный слой точно отрисован до захвата */
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

        const available = labels.reduce((n, _, i) => n + (getExportEl(i) ? 1 : 0), 0);
        if (available === 0) {
          toast("Слой рендера недоступен. Переключитесь на вкладку «Наклейки» и попробуйте снова.", "error");
          return;
        }
        if (available < labels.length) {
          toast(`Внимание: ${labels.length - available} из ${labels.length} наклеек не найдены для рендера`, "info");
        }

        const where = isElectron() ? " — папка откроется автоматически" : " — файл в папке «Загрузки»";
        if (kind === "zip") {
          await exportZip(labels, getExportEl, sizePx, (pct) => setExporting({ pct, label: pct < 96 ? "Рендер JPG" : "Упаковка ZIP" }), token);
          toast(`ZIP готов — ${labels.length} наклеек${where}`, "success");
        } else {
          await exportPdf(labels, getExportEl, sizePx, sizeMm, (pct) => setExporting({ pct, label: "Сборка PDF" }), token);
          toast(`PDF сохранён — ${labels.length} страниц (${sizeMm.wMm}×${sizeMm.hMm} мм)${where}`, "success");
        }
      } catch (err) {
        if (err instanceof ExportCancelled) {
          toast("Экспорт остановлен", "info");
        } else {
          console.error(err);
          toast(err instanceof Error && err.message ? err.message : "Ошибка экспорта. Попробуйте ещё раз.", "error");
        }
      } finally {
        cancelRef.current = null;
        setExporting(null);
      }
    },
    [labels, exporting, getExportEl, toast, settings]
  );

  const stopExport = useCallback(() => {
    if (cancelRef.current) cancelRef.current.cancelled = true;
  }, []);

  /* ── Действия ── */
  const handleReset = useCallback(() => {
    setFields(EMPTY_FIELDS);
    setSame({ order: false, material: false, quantity: false });
    setCustomValues({});
    setImages([]);
    setBarcodeUploads([]);
    toast("Все данные сброшены", "info");
  }, [toast]);

  const handleDemo = useCallback(async () => {
    setFields(DEMO_FIELDS);
    setSame({ order: true, material: true, quantity: false });
    setBarcodeUploads([]);
    setImages(await resolveDemoImages());
    toast("Демо-данные загружены — 3 наклейки (2 + 1)", "success");
  }, [toast]);

  const patchSettings = useCallback((patch: Partial<typeof settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleLogoFile = useCallback(async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast("Логотип больше 2 МБ — выберите файл поменьше", "error");
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      patchSettings({ logo: dataUrl });
      toast("Логотип обновлён", "success");
    } catch {
      toast("Не удалось прочитать файл логотипа", "error");
    }
  }, [patchSettings, toast]);

  const handlePrint = useCallback(() => {
    if (labels.length === 0) {
      toast("Нет наклеек для печати — заполните поля", "error");
      return;
    }
    window.print();
  }, [labels.length, toast]);

  /* ── Горячие клавиши ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlePrint]);

  const busy = exporting !== null;
  const exportPx = labelPx(settings);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-ink-900 font-body">
      <TitleBar />

      {/* ── Вкладки модулей ── */}
      <div className="no-print h-10 bg-ink-900 border-b border-white/8 flex items-stretch px-3 shrink-0">
        <TabBtn
          active={tab === "labels"}
          onClick={() => setTab("labels")}
          icon={<IconTag size={14} />}
          label="Наклейки"
          badge={labels.length}
        />
        <TabBtn
          active={tab === "checker"}
          onClick={() => setTab("checker")}
          icon={<IconClipboardCheck size={14} />}
          label="Проверка списков"
          badge={checkerStats.lists}
        />
      </div>

      {/* ── Тулбар (модуль наклеек) ── */}
      {tab === "labels" && (
        <div className="no-print bg-ink-800 dark-grid border-b border-white/8 shrink-0 relative">
          <div className="flex items-center justify-between px-3.5 py-2 gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <button className="tb-btn tb-ghost cursor-pointer" onClick={handleDemo} disabled={busy}>
                <IconSpark size={14} /> Демо
              </button>
              <button className="tb-btn tb-ghost tb-danger cursor-pointer" onClick={handleReset} disabled={busy}>
                <IconReset size={14} /> Сброс
              </button>
              <button className="tb-btn tb-soft cursor-pointer" onClick={() => setSettingsOpen(true)} title="Логотип, размер (мм), шрифт, ячейки, графы">
                <IconSettings size={14} /> Настройки
              </button>
              <span className="w-px h-6 bg-white/12 mx-1.5" />
              <button className="tb-btn tb-soft cursor-pointer" onClick={() => runExport("pdf")} disabled={busy || labels.length === 0} title="Каждая наклейка — отдельная страница (размер в мм)">
                <IconPdf size={14} /> PDF
              </button>
              <button className="tb-btn tb-soft cursor-pointer" onClick={() => runExport("zip")} disabled={busy || labels.length === 0} title="Архив JPG в масштабе 1.5×">
                <IconZip size={14} /> JPG · ZIP
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              {busy && exporting && (
                <>
                  <span className="font-mono text-[11px] font-bold text-lime-glow tabular-nums">
                    {exporting.label}… {exporting.pct}%
                  </span>
                  <button
                    className="flex items-center gap-1.5 rounded-lg border border-rust/50 bg-rust/12 px-2.5 py-1.5 text-[11.5px] font-bold text-[#f2a193] hover:bg-rust hover:text-white transition-colors cursor-pointer"
                    onClick={stopExport}
                    title="Прервать экспорт"
                  >
                    <IconX size={12} /> Остановить
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Полоса прогресса экспорта */}
          <div className={`h-1 bg-ink-950/60 overflow-hidden transition-opacity duration-300 ${busy ? "opacity-100" : "opacity-0"}`}>
            <div
              className="h-full bg-moss-500 progress-stripes transition-[width] duration-200 ease-out"
              style={{ width: `${exporting?.pct ?? 0}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Основная область ── */}
      {tab === "checker" ? (
        <main className="flex-1 overflow-y-auto nice-scroll workspace-bg">
          <ListChecker onToast={toast} onStats={setCheckerStats} />
        </main>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          <aside className="no-print w-[365px] shrink-0 bg-paper-2 border-r border-ink-200/60 overflow-y-auto nice-scroll p-4">
            <EditorPanel
              fields={fields}
              customValues={customValues}
              customFields={settings.customFields}
              same={same}
              images={images}
              barcodeUploads={barcodeUploads}
              onField={(k: FieldKey, v: string) => setFields((p) => ({ ...p, [k]: v }))}
              onCustomValue={(id, v) => setCustomValues((p) => ({ ...p, [id]: v }))}
              onSame={(k, v) => setSame((p) => ({ ...p, [k]: v }))}
              onAddImages={handleAddImages}
              onAddBarcodes={handleAddBarcodes}
              onViewImages={() => setMediaModal("images")}
              onViewBarcodes={() => setMediaModal("barcodes")}
            />
          </aside>

          <main className="flex-1 workspace-bg overflow-y-auto nice-scroll relative">
            <Workspace
              labels={labels}
              zoom={zoom}
              settings={settings}
              onDemo={handleDemo}
              onOpen={(i) => setLightbox(i)}
            />
          </main>
        </div>
      )}

      <StatusBar
        mode={tab}
        uniqueCount={uniqueCount}
        totalCount={labels.length}
        saveState={saveState}
        zoom={zoom}
        onZoom={(z) => setZoom(z)}
        labelSize={`${settings.widthMm}×${settings.heightMm} мм`}
        checker={checkerStats}
      />

      {/* ── Скрытый экспортный слой (полный размер) ── */}
      <div
        ref={exportLayerRef}
        aria-hidden
        className="no-print fixed top-0 pointer-events-none"
        style={{ left: -exportPx.w - 400, width: exportPx.w }}
      >
        {labels.map((l, i) => (
          <div key={i} data-label-index={i}>
            <LabelSheet data={l} settings={settings} />
          </div>
        ))}
      </div>

      {/* ── Зона печати ── */}
      {/* Страница = физическому размеру наклейки в мм. Наклейка рисуется
          в px (10 px/мм) и масштабируется под мм-страницу: 96 CSS-px на дюйм. */}
      <style>{`@media print {
        @page { size: ${settings.widthMm}mm ${settings.heightMm}mm; margin: 0; }
        .print-sheet { width: ${settings.widthMm}mm; height: ${settings.heightMm}mm; overflow: hidden; page-break-after: always; }
        .print-sheet:last-child { page-break-after: auto; }
        .print-sheet > div { transform: scale(0.377953); transform-origin: top left; }
      }`}</style>
      <div className="hidden print:block">
        {labels.map((l, i) => (
          <div key={i} className="print-sheet">
            <LabelSheet data={l} settings={settings} />
          </div>
        ))}
      </div>

      {/* ── Модальные окна ── */}
      {settingsOpen && (
        <SettingsModal
          settings={settings}
          onChange={patchSettings}
          onClose={() => setSettingsOpen(false)}
          onLogoFile={handleLogoFile}
          onResetAll={() => setSettings(DEFAULT_SETTINGS)}
          notify={toast}
        />
      )}

      {mediaModal && (
        <MediaModal
          kind={mediaModal}
          items={mediaModal === "images" ? images : barcodeUploads}
          onClose={() => setMediaModal(null)}
          onRemove={(i) =>
            mediaModal === "images"
              ? setImages((prev) => prev.filter((_, j) => j !== i))
              : setBarcodeUploads((prev) => prev.filter((_, j) => j !== i))
          }
          onReplace={(i, f) =>
            mediaModal === "images" ? handleReplaceImage(i, f) : handleReplaceBarcode(i, f)
          }
          onMove={(i, dir) =>
            mediaModal === "images"
              ? setImages((prev) => move(prev, i, dir))
              : setBarcodeUploads((prev) => move(prev, i, dir))
          }
        />
      )}

      {lightbox !== null && labels.length > 0 && (
        <Lightbox
          labels={labels}
          index={Math.min(lightbox, labels.length - 1)}
          settings={settings}
          onClose={() => setLightbox(null)}
          onNav={(i) => setLightbox(i)}
        />
      )}

      <Toasts items={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
}
