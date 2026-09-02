import { useEffect, useRef, useState } from "react";
import { IconCheck, IconDownload, IconInfo, IconX } from "./icons";

const EXE_STEPS = [
  "npm install",
  "npm run build",
  "npm i -D electron electron-builder",
  "npx electron-builder --config electron-builder.yml --win",
];

interface Props {
  canInstall: boolean;
  installed: boolean;
  onInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
  onNotify: (text: string, kind?: "info" | "success" | "error") => void;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

/** Выпадающее меню «Скачать программу»: установка одним кликом + сборка .exe */
export default function DownloadMenu({ canInstall, installed, onInstall, onNotify }: Props) {
  const [open, setOpen] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | "all" | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const handleInstall = async () => {
    setInstalling(true);
    const result = await onInstall();
    setInstalling(false);
    if (result === "accepted") onNotify("Приложение установлено — ищите ярлык в меню «Пуск»", "success");
    else if (result === "dismissed") onNotify("Установка отменена", "info");
  };

  const handleCopy = async (text: string, idx: number | "all") => {
    const ok = await copyText(text);
    if (ok) {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1600);
      onNotify("Команды скопированы", "success");
    } else {
      onNotify("Не удалось скопировать — выделите текст вручную", "error");
    }
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        className="tb-btn tb-amber cursor-pointer"
        onClick={() => setOpen((v) => !v)}
        title="Как получить приложение для Windows"
      >
        <IconDownload size={14} /> Скачать
        {installed && <span className="w-1.5 h-1.5 rounded-full bg-moss-500 inline-block" />}
      </button>

      {open && (
        <div className="pop-in absolute right-0 top-[calc(100%+10px)] z-50 w-[380px] rounded-xl border border-ink-200/70 bg-paper shadow-[0_24px_60px_rgba(10,16,12,0.45)] overflow-hidden text-ink-900">
          {/* Шапка меню */}
          <div className="flex items-start justify-between px-4 pt-3.5 pb-3 border-b border-ink-200/60 bg-paper-2">
            <div>
              <div className="font-display text-[13px] font-bold text-ink-900">Получить приложение</div>
              <div className="text-[11px] text-ink-500 mt-0.5">Два способа — без регистрации и платежей</div>
            </div>
            <button className="cursor-pointer rounded-md p-1 text-ink-400 hover:text-rust hover:bg-rust/10 transition-colors" onClick={() => setOpen(false)} title="Закрыть">
              <IconX size={13} />
            </button>
          </div>

          {/* Способ 1: установка одним кликом */}
          <div className="px-4 py-3.5 border-b border-ink-200/60">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-5 h-5 rounded-md bg-moss-500 text-white font-mono text-[11px] font-bold flex items-center justify-center">1</span>
              <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-700">Установка одним кликом</span>
            </div>

            {installed ? (
              <div className="flex items-center gap-2 rounded-lg bg-moss-500/12 border border-moss-500/30 px-3 py-2.5">
                <IconCheck size={15} className="text-moss-600 shrink-0" />
                <span className="text-[12px] font-semibold text-moss-700">Уже установлено — ярлык в меню «Пуск»</span>
              </div>
            ) : (
              <>
                <button
                  className={`w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[13px] font-bold transition-all cursor-pointer ${
                    canInstall
                      ? "bg-moss-600 text-white hover:bg-moss-500 shadow-[0_4px_14px_rgba(35,160,88,0.4)] active:scale-[0.98]"
                      : "bg-ink-200/60 text-ink-500"
                  }`}
                  onClick={handleInstall}
                  disabled={!canInstall || installing}
                >
                  {installing ? (
                    <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <IconDownload size={15} />
                  )}
                  {installing ? "Устанавливаем…" : "Установить для Windows"}
                </button>
                {!canInstall && (
                  <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-ink-500">
                    <IconInfo size={13} className="mt-px shrink-0 text-sky-info" />
                    <span>
                      Откройте этот сайт в <b>Microsoft Edge</b> или <b>Chrome</b> — кнопка станет активной,
                      либо нажмите значок <b>монитора в адресной строке</b> браузера. Приложение появится в меню «Пуск» и работает офлайн.
                    </span>
                  </p>
                )}
              </>
            )}
          </div>

          {/* Способ 2: сборка .exe */}
          <div className="px-4 py-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-ink-800 text-lime-glow font-mono text-[11px] font-bold flex items-center justify-center">2</span>
                <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-700">Установщик .exe (собрать на ПК)</span>
              </div>
              <button
                className="cursor-pointer flex items-center gap-1.5 text-[11px] font-bold text-moss-700 hover:text-moss-600 transition-colors"
                onClick={() => handleCopy(EXE_STEPS.join("\n"), "all")}
              >
                {copiedIdx === "all" ? <IconCheck size={12} /> : <IconDownload size={12} className="rotate-180" />}
                {copiedIdx === "all" ? "Готово" : "Копировать все"}
              </button>
            </div>

            <ol className="flex flex-col gap-1.5">
              {EXE_STEPS.map((cmd, i) => (
                <li key={cmd} className="group flex items-center gap-2">
                  <span className="font-mono text-[10.5px] text-ink-300 w-3 text-right">{i + 1}.</span>
                  <code className="flex-1 font-mono text-[11.5px] font-semibold bg-ink-900 text-lime-glow rounded-md px-2.5 py-1.5 truncate">
                    {cmd}
                  </code>
                  <button
                    className="cursor-pointer rounded-md p-1.5 text-ink-300 hover:text-moss-600 hover:bg-moss-500/12 transition-colors"
                    onClick={() => handleCopy(cmd, i)}
                    title="Копировать команду"
                  >
                    {copiedIdx === i ? <IconCheck size={12} className="text-moss-600" /> : <IconDownload size={12} className="rotate-180" />}
                  </button>
                </li>
              ))}
            </ol>

            <p className="mt-2.5 text-[11px] leading-snug text-ink-500">
              В терминале папки проекта — появится файл{" "}
              <code className="font-mono font-semibold text-ink-700 bg-ink-200/50 rounded px-1">release/Nakleyki4K-Setup-*.exe</code>{" "}
              с ярлыками на рабочем столе и в «Пуске». Полная инструкция — <b>WINDOWS.md</b> в корне проекта.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
