import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  FieldKey, FieldsState, LabelData, SameFlags, ToastItem, ToastKind, ExportProgress,
} from "./types";
import { normalizeEan13, generateBarcodeDataUrl } from "./lib/barcode";
import { exportZip, exportPdf, LABEL_W } from "./lib/exporters";
import { DEMO_FIELDS, DEMO_IMAGES } from "./lib/demo";
import LabelSheet from "./components/LabelSheet";
import Workspace from "./components/Workspace";
import EditorPanel from "./components/EditorPanel";
import { TitleBar, StatusBar, Toasts } from "./components/Chrome";
import { IconPrint, IconPdf, IconZip, IconReset, IconSpark } from "./components/icons";

const K_FIELDS = "nkl4k:fields";
const K_SAME = "nkl4k:same";
const K_ZOOM = "nkl4k:zoom";

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
  const [zoom, setZoom] = useState<number>(() => {
    const z = parseFloat(localStorage.getItem(K_ZOOM) ?? "");
    return [0.4, 0.55, 0.7, 0.85, 1].includes(z) ? z : 0.55;
  });
  const [images, setImages] = useState<string[]>([]);
  const [barcodeUploads, setBarcodeUploads] = useState<string[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [exporting, setExporting] = useState<ExportProgress | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  const exportRefs = useRef<(HTMLDivElement | null)[]>([]);
  const toastId = useRef(0);
  const firstSave = useRef(true);

  /* ── Тосты ─────────────────────────────────────────────── */
  const toast = useCallback((text: string, kind: ToastKind = "info") => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev.slice(-3), { id, kind, text }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4200);
  }, []);

  /* ── Автосохранение ────────────────────────────────────── */
  useEffect(() => {
    if (firstSave.current) { firstSave.current = false; return; }
    setSaveState("saving");
    const t = setTimeout(() => {
      try {
        localStorage.setItem(K_FIELDS, JSON.stringify(fields));
        localStorage.setItem(K_SAME, JSON.stringify(same));
        localStorage.setItem(K_ZOOM, String(zoom));
      } catch { /* переполнение хранилища не критично */ }
      setSaveState("saved");
    }, 450);
    return () => clearTimeout(t);
  }, [fields, same, zoom]);

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
      L.code.length, L.quantity.length, L.barcode.length, images.length
    );
    if (baseLen === 0 || (L.name[0] === "" && images.length === 0)) return [];

    const result: LabelData[] = [];
    for (let i = 0; i < baseLen; i++) {
      const count = Math.min(Math.max(parseInt(L.copies[i], 10) || 1, 1), 500);
      const generated = barcodeByLine[i] ?? { state: "none" as const, img: null };
      const uploaded = barcodeUploads[i] ?? null;
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
      };
      for (let j = 0; j < count; j++) {
        result.push({ ...base, copyIndex: j + 1, totalCopies: count });
      }
    }
    return result;
  }, [lines, images, barcodeUploads, barcodeByLine, same]);

  const uniqueCount = useMemo(() => {
    if (labels.length === 0) return 0;
    return labels[labels.length - 1].uniqueIndex;
  }, [labels]);

  /* ── Загрузки файлов ───────────────────────────────────── */
  const handleAddImages = useCallback(async (files: File[]) => {
    const processed = await Promise.all(
      files.map(
        (file) =>
          new Promise<string>((resolve) => {
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
                  resolve(canvas.toDataURL("image/png"));
                  return;
                }
              }
              resolve(url);
            };
            img.onerror = () => resolve(url);
            img.src = url;
          })
      )
    );
    setImages((prev) => [...prev, ...processed]);
    toast(`Добавлено фото: ${processed.length}`, "success");
  }, [toast]);

  const handleAddBarcodes = useCallback((files: File[]) => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setBarcodeUploads((prev) => [...prev, ...urls]);
    toast(`Добавлено штрихкодов: ${urls.length}`, "success");
  }, [toast]);

  /* ── Действия ──────────────────────────────────────────── */
  const getExportEl = useCallback((i: number) => exportRefs.current[i] ?? null, []);

  const runExport = useCallback(
    async (kind: "zip" | "pdf") => {
      if (labels.length === 0 || exporting) return;
      setExporting({ pct: 0, label: kind === "zip" ? "Рендер JPG" : "Рендер страниц" });
      try {
        if (kind === "zip") {
          await exportZip(labels, getExportEl, (pct) => setExporting({ pct, label: pct < 100 ? "Рендер JPG" : "Упаковка ZIP" }));
          toast(`ZIP готов — ${labels.length} наклеек`, "success");
        } else {
          await exportPdf(labels, getExportEl, (pct) => setExporting({ pct, label: "Сборка PDF" }));
          toast(`PDF сохранён — ${labels.length} страниц`, "success");
        }
      } catch (err) {
        console.error(err);
        toast("Ошибка экспорта. Попробуйте ещё раз.", "error");
      } finally {
        setExporting(null);
      }
    },
    [labels, exporting, getExportEl, toast]
  );

  const handleReset = useCallback(() => {
    setFields(EMPTY_FIELDS);
    setSame({ order: false, material: false, quantity: false });
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

  const handleWinButton = useCallback((b: string) => {
    if (b === "close") toast("Это веб-окно. Установщик .exe закрывается как обычное приложение — см. WINDOWS.md", "info");
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

      {/* ── Тулбар ── */}
      <div className="no-print bg-ink-800 dark-grid border-b border-white/8 shrink-0 relative">
        <div className="flex items-center justify-between px-3.5 py-2 gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <button className="tb-btn tb-ghost cursor-pointer" onClick={handleDemo} disabled={busy}>
              <IconSpark size={14} /> Демо
            </button>
            <button className="tb-btn tb-ghost tb-danger cursor-pointer" onClick={handleReset} disabled={busy}>
              <IconReset size={14} /> Сброс
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
              <span className="font-mono text-[11px] font-bold text-lime-glow tabular-nums">
                {exporting.label}… {exporting.pct}%
              </span>
            )}
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

      {/* ── Основная область ── */}
      <div className="flex-1 flex overflow-hidden">
        <aside className="no-print w-[365px] shrink-0 bg-paper-2 border-r border-ink-200/60 overflow-y-auto nice-scroll p-4">
          <EditorPanel
            fields={fields}
            same={same}
            images={images}
            barcodeUploads={barcodeUploads}
            onField={(k: FieldKey, v: string) => setFields((p) => ({ ...p, [k]: v }))}
            onSame={(k, v) => setSame((p) => ({ ...p, [k]: v }))}
            onAddImages={handleAddImages}
            onRemoveImage={(i) => setImages((p) => p.filter((_, j) => j !== i))}
            onAddBarcodes={handleAddBarcodes}
            onRemoveBarcode={(i) => setBarcodeUploads((p) => p.filter((_, j) => j !== i))}
          />
        </aside>

        <main className="flex-1 workspace-bg overflow-y-auto nice-scroll relative">
          <Workspace labels={labels} zoom={zoom} onDemo={handleDemo} />
        </main>
      </div>

      <StatusBar
        uniqueCount={uniqueCount}
        totalCount={labels.length}
        saveState={saveState}
        zoom={zoom}
        onZoom={(z) => setZoom(z)}
      />

      {/* ── Скрытый экспортный слой (полный размер 500×850) ── */}
      <div aria-hidden className="no-print fixed top-0 pointer-events-none" style={{ left: -LABEL_W - 400, width: LABEL_W }}>
        {labels.map((l, i) => (
          <div key={i} ref={(el) => { exportRefs.current[i] = el; }}>
            <LabelSheet data={l} />
          </div>
        ))}
      </div>

      {/* ── Зона печати ── */}
      <div className="hidden print:block">
        {labels.map((l, i) => (
          <div key={i} className="print-sheet">
            <LabelSheet data={l} />
          </div>
        ))}
      </div>

      <Toasts items={toasts} onDismiss={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
    </div>
  );
}
