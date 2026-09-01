import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  FieldKey, FieldsState, LabelData, LabelSettings, MediaKind, SameFlags,
  ToastItem, ToastKind, ExportProgress,
} from "./types";
import { normalizeEan13, generateBarcodeDataUrl } from "./lib/barcode";
import { exportZip, exportPdf, ExportCancelled, type CancelToken } from "./lib/exporters";
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from "./lib/settings";
import { processImageFile, fileToDataUrl } from "./lib/images";
import { DEMO_FIELDS, DEMO_IMAGES } from "./lib/demo";
import LabelSheet from "./components/LabelSheet";
import Workspace from "./components/Workspace";
import EditorPanel from "./components/EditorPanel";
import SettingsModal from "./components/SettingsModal";
import MediaModal from "./components/MediaModal";
import Lightbox from "./components/Lightbox";
import { TitleBar, StatusBar, Toasts } from "./components/Chrome";
import DownloadMenu from "./components/DownloadMenu";
import ListChecker from "./components/ListChecker";
import { useInstallPrompt } from "./hooks/useInstallPrompt";
import {
  IconPrint, IconPdf, IconZip, IconReset, IconSpark, IconSettings, IconX,
  IconTag, IconClipboardCheck,
} from "./components/icons";

type Tab = "labels" | "checker";

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

const K_FIELDS = "nkl4k:fields";
const K_SAME = "nkl4k:same";
const K_ZOOM = "nkl4k:zoom";
const K_CUSTOM = "nkl4k:custom";

const EMPTY_FIELDS: FieldsState = {
  name: "", file: "", order: "", material: "", code: "", quantity: "", barcode: "", copies: "",
};

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

const splitLines = (t: string) => t.split("\n").map((s) => s.trim());

export default function App() {
  const [fields, setFields] = useState<FieldsState>(() => loadJson(K_FIELDS, EMPTY_FIELDS));
  const [same, setSame] = useState<SameFlags>(() => loadJson(K_SAME, { order: false, material: false, quantity: false }));
  const [customValues, setCustomValues] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem(K_CUSTOM);
      return raw ? (JSON.parse(raw) as Record<string, string>) : {};
    } catch {
      return {};
    }
  });
  const [zoom, setZoom] = useState<number>(() => {
    const z = parseFloat(localStorage.getItem(K_ZOOM) ?? "");
    return [0.4, 0.55, 0.7, 0.85, 1].includes(z) ? z : 0.55;
  });
  const [settings, setSettings] = useState<LabelSettings>(() => loadSettings());
  const [images, setImages] = useState<string[]>([]);
  const [barcodeUploads, setBarcodeUploads] = useState<string[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [exporting, setExporting] = useState<ExportProgress | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mediaModal, setMediaModal] = useState<MediaKind | null>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const [tab, setTab] = useState<Tab>(() => (localStorage.getItem("nkl4k:tab") === "checker" ? "checker" : "labels"));
  const [checkerStats, setCheckerStats] = useState<{ lists: number; lines: number; passed: boolean | null }>({
    lists: 0, lines: 0, passed: null,
  });

  useEffect(() => {
    localStorage.setItem("nkl4k:tab", tab);
  }, [tab]);

  const exportRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cancelRef = useRef<CancelToken | null>(null);
  const toastId = useRef(0);
  const firstSave = useRef(true);

  /* ── Тосты ─────────────────────────────────────────────── */
  const toast = useCallback((text: string, kind: ToastKind = "info") => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev.slice(-3), { id, kind, text }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4200);
  }, []);

  /* ── Установка как приложение Windows (PWA) ────────────── */
  const onAppInstalled = useCallback(() => {
    toast("Приложение установлено — ярлык добавлен в меню «Пуск»", "success");
  }, [toast]);
  const { canInstall, installed, install } = useInstallPrompt(onAppInstalled);

  /* ── Автосохранение полей ──────────────────────────────── */
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

  /* ── Настройки (сохраняются сразу при изменении) ───────── */
  const patchSettings = useCallback((patch: Partial<LabelSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  /* ── Сборка строк наклеек ──────────────────────────────── */
  const lines = useMemo(
    () => ({
      name: splitLines(fields.name),
      file: splitLines(fields.file),
      order: splitLines(fields.order),
      material: splitLines(fields.material),
      code: splitLines(fields.code),
      quantity: splitLines(fields.quantity),
      barcode: splitLines(fields.barcode),
      copies: splitLines(fields.copies),
    }),
    [fields]
  );

  const customLines = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const f of settings.customFields) {
      out[f.id] = splitLines(customValues[f.id] ?? "");
    }
    return out;
  }, [customValues, settings.customFields]);

  const barcodeByLine = useMemo(
    () =>
      lines.barcode.map((line) => {
        const n = normalizeEan13(line);
        if (n.state === "empty") return { state: "none" as const, img: null as string | null };
        if (n.state === "error" || !n.digits) return { state: "error" as const, img: null as string | null };
        const img = generateBarcodeDataUrl(n.digits);
        return img ? { state: "ok" as const, img } : { state: "error" as const, img: null as string | null };
      }),
    [lines.barcode]
  );

  const labels = useMemo<LabelData[]>(() => {
    const L = lines;
    const baseLen = Math.max(
      L.name.length, L.file.length, L.order.length, L.material.length,
      L.code.length, L.quantity.length, L.barcode.length,
      Object.values(customLines).reduce((m, arr) => Math.max(m, arr.length), 0),
      images.length
    );
    if (baseLen === 0 || (L.name[0] === "" && images.length === 0)) return [];

    const result: LabelData[] = [];
    for (let i = 0; i < baseLen; i++) {
      const count = Math.min(Math.max(parseInt(L.copies[i], 10) || 1, 1), 500);
      const generated = barcodeByLine[i] ?? { state: "none" as const, img: null };
      const uploaded = barcodeUploads[i] ?? null;
      const custom: Record<string, string> = {};
      for (const f of settings.customFields) {
        custom[f.id] = customLines[f.id]?.[i] ?? "";
      }
      const base: Omit<LabelData, "copyIndex" | "totalCopies"> = {
        name: L.name[i] || "",
        file: L.file[i] || "",
        order: same.order ? L.order[0] || "" : L.order[i] || "",
        material: same.material ? L.material[0] || "" : L.material[i] || "",
        code: L.code[i] || "",
        quantity: same.quantity ? L.quantity[0] || "" : L.quantity[i] || "",
        barcodeText: L.barcode[i] || "",
        barcodeState: uploaded ? "ok" : generated.state,
        barcodeImage: uploaded ?? generated.img,
        image: images[i] || null,
        uniqueIndex: i + 1,
        custom,
      };
      for (let j = 0; j < count; j++) {
        result.push({ ...base, copyIndex: j + 1, totalCopies: count });
      }
    }
    return result;
  }, [lines, images, barcodeUploads, barcodeByLine, same, customLines, settings.customFields]);

  const uniqueCount = useMemo(() => {
    if (labels.length === 0) return 0;
    return labels[labels.length - 1].uniqueIndex;
  }, [labels]);

  /* Лайтбокс не должен указывать за пределы списка */
  useEffect(() => {
    if (lightbox !== null && lightbox >= labels.length) {
      setLightbox(labels.length > 0 ? labels.length - 1 : null);
    }
  }, [labels.length, lightbox]);

  /* ── Загрузки файлов ───────────────────────────────────── */
  const handleAddImages = useCallback(async (files: File[]) => {
    const processed = await Promise.all(files.map((f) => processImageFile(f)));
    setImages((prev) => [...prev, ...processed]);
    toast(`Добавлено фото: ${processed.length}`, "success");
  }, [toast]);

  const handleAddBarcodes = useCallback((files: File[]) => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setBarcodeUploads((prev) => [...prev, ...urls]);
    toast(`Добавлено штрихкодов: ${urls.length}`, "success");
  }, [toast]);

  const handleReplaceImage = useCallback(async (i: number, file: File) => {
    const url = await processImageFile(file);
    setImages((prev) => prev.map((x, j) => (j === i ? url : x)));
    toast(`Фото ${i + 1} заменено`, "success");
  }, [toast]);

  const handleReplaceBarcode = useCallback((i: number, file: File) => {
    const url = URL.createObjectURL(file);
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

  /* ── Действия ──────────────────────────────────────────── */
  const getExportEl = useCallback((i: number) => exportRefs.current[i] ?? null, []);

  const runExport = useCallback(
    async (kind: "zip" | "pdf") => {
      if (labels.length === 0 || exporting) return;
      const token: CancelToken = { cancelled: false };
      cancelRef.current = token;
      exportRefs.current = [];
      setExporting({ pct: 0, label: kind === "zip" ? "Рендер JPG" : "Рендер страниц" });
      const size = { w: settings.width, h: settings.height };
      try {
        if (kind === "zip") {
          await exportZip(labels, getExportEl, size, (pct) => setExporting({ pct, label: pct < 96 ? "Рендер JPG" : "Упаковка ZIP" }), token);
          toast(`ZIP готов — ${labels.length} наклеек`, "success");
        } else {
          await exportPdf(labels, getExportEl, size, (pct) => setExporting({ pct, label: "Сборка PDF" }), token);
          toast(`PDF сохранён — ${labels.length} страниц`, "success");
        }
      } catch (err) {
        if (err instanceof ExportCancelled) {
          toast("Экспорт остановлен", "info");
        } else {
          console.error(err);
          toast("Ошибка экспорта. Попробуйте ещё раз.", "error");
        }
      } finally {
        cancelRef.current = null;
        setExporting(null);
      }
    },
    [labels, exporting, getExportEl, toast, settings.width, settings.height]
  );

  const stopExport = useCallback(() => {
    if (cancelRef.current) cancelRef.current.cancelled = true;
  }, []);

  const handleReset = useCallback(() => {
    setFields(EMPTY_FIELDS);
    setSame({ order: false, material: false, quantity: false });
    setCustomValues({});
    setImages([]);
    setBarcodeUploads([]);
    toast("Все данные сброшены", "info");
  }, [toast]);

  const handleDemo = useCallback(() => {
    setFields(DEMO_FIELDS);
    setSame({ order: true, material: true, quantity: false });
    setImages(DEMO_IMAGES);
    setBarcodeUploads([]);
    toast("Демо-данные загружены — 3 наклейки (2 + 1)", "success");
  }, [toast]);

  const handlePrint = useCallback(() => {
    if (labels.length === 0) {
      toast("Нет наклеек для печати — заполните поля", "error");
      return;
    }
    window.print();
  }, [labels.length, toast]);

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

  const handleWinButton = useCallback((b: string) => {
    if (b === "close") toast("Это веб-окно. Кнопка «Скачать» в тулбаре покажет, как получить программу для Windows", "info");
    else if (b === "max") toast("Окно уже развёрнуто на всю рабочую область", "info");
    else toast("Сворачивание доступно в десктоп-версии (Electron)", "info");
  }, [toast]);

  /* ── Горячие клавиши ───────────────────────────────────── */
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

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-ink-900 font-body">
      <TitleBar onWinButton={handleWinButton} />

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
            <button className="tb-btn tb-soft cursor-pointer" onClick={() => setSettingsOpen(true)} title="Логотип, размер, шрифт, ячейки, графы">
              <IconSettings size={14} /> Настройки
            </button>
            <span className="w-px h-6 bg-white/12 mx-1.5" />
            <button className="tb-btn tb-soft cursor-pointer" onClick={() => runExport("pdf")} disabled={busy || labels.length === 0} title="Каждая наклейка — отдельная страница">
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
            <DownloadMenu
              canInstall={canInstall}
              installed={installed}
              onInstall={install}
              onNotify={toast}
            />
            <button className="tb-btn tb-primary cursor-pointer" onClick={handlePrint} disabled={busy} title="Ctrl+Enter">
              <IconPrint size={15} /> Печать
            </button>
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
        uniqueCount={uniqueCount}
        totalCount={labels.length}
        saveState={saveState}
        zoom={zoom}
        onZoom={(z) => setZoom(z)}
        labelSize={`${settings.width}×${settings.height}`}
        mode={tab}
        checker={checkerStats}
      />

      {/* ── Скрытый экспортный слой (полный размер) ── */}
      <div aria-hidden className="no-print fixed top-0 pointer-events-none" style={{ left: -settings.width - 400, width: settings.width }}>
        {labels.map((l, i) => (
          <div key={i} ref={(el) => { exportRefs.current[i] = el; }}>
            <LabelSheet data={l} settings={settings} />
          </div>
        ))}
      </div>

      {/* ── Зона печати ── */}
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
              ? setImages((p) => p.filter((_, j) => j !== i))
              : setBarcodeUploads((p) => p.filter((_, j) => j !== i))
          }
          onReplace={(i, f) =>
            mediaModal === "images" ? handleReplaceImage(i, f) : handleReplaceBarcode(i, f)
          }
          onMove={(i, dir) =>
            mediaModal === "images"
              ? setImages((p) => move(p, i, dir))
              : setBarcodeUploads((p) => move(p, i, dir))
          }
        />
      )}

      {lightbox !== null && (
        <Lightbox
          labels={labels}
          index={lightbox}
          settings={settings}
          onClose={() => setLightbox(null)}
          onNav={(i) => setLightbox(i)}
        />
      )}

      <Toasts items={toasts} onDismiss={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
    </div>
  );
}
