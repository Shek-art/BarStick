import { useRef, useState, type DragEvent } from "react";
import { IconUpload } from "./icons";

interface Props {
  title: string;
  hint: string;
  countText: string | null;
  onFiles: (files: File[]) => void;
}

/** Зона загрузки файлов с drag&drop и подсветкой при наведении */
export default function Dropzone({ title, hint, countText, onFiles }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (files.length) onFiles(files);
  };

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-500">{title}</span>
        {countText && (
          <span className="text-[10.5px] font-bold text-moss-600 bg-moss-500/10 border border-moss-500/25 rounded-full px-2 py-0.5 pop-in">
            {countText}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
        className={`w-full rounded-xl border-2 border-dashed px-4 py-5 text-center transition-all duration-200 cursor-pointer group ${
          drag
            ? "border-moss-500 bg-moss-500/10 scale-[1.02] shadow-lg shadow-moss-500/10"
            : "border-ink-200/80 bg-paper hover:border-moss-500/60 hover:bg-moss-500/5"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length) onFiles(files);
            e.target.value = "";
          }}
        />
        <IconUpload
          size={22}
          className={`mx-auto mb-1.5 transition-all duration-200 ${drag ? "text-moss-600 -translate-y-0.5" : "text-ink-300 group-hover:text-moss-600 group-hover:-translate-y-0.5"}`}
        />
        <span className={`block text-xs font-semibold ${drag ? "text-moss-700" : "text-ink-500"}`}>
          {drag ? "Отпустите файлы" : hint}
        </span>
      </button>
    </div>
  );
}
