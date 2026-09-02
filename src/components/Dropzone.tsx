import { useRef, useState } from "react";
import { IconUpload, IconEye } from "./icons";

interface Props {
  title: string;
  hint: string;
  count: number;
  onFiles: (files: File[]) => void;
  onView?: () => void;
}

/** Зона загрузки файлов с drag&drop и кнопкой просмотра списка */
export default function Dropzone({ title, hint, count, onFiles, onView }: Props) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    onFiles(Array.from(list));
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={`rounded-xl border-2 border-dashed px-4 py-3.5 text-left cursor-pointer transition-all duration-200 group ${
        drag
          ? "border-moss-500 bg-moss-500/12 scale-[1.015] shadow-md"
          : "border-ink-200/80 bg-white hover:border-moss-500/55 hover:bg-moss-500/5"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
      />

      <div className="flex items-center gap-3">
        <span className={`shrink-0 rounded-lg p-2 transition-colors ${drag ? "bg-moss-500 text-white" : "bg-paper-2 text-ink-400 group-hover:bg-moss-500/15 group-hover:text-moss-600"}`}>
          <IconUpload size={16} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[12.5px] font-bold text-ink-800">{title}</span>
            {count > 0 && (
              <span key={count} className="pop-in inline-flex items-center whitespace-nowrap shrink-0 font-mono text-[10px] font-bold text-moss-700 bg-moss-500/12 border border-moss-500/25 rounded-full px-1.5 py-px">
                {count}&nbsp;шт
              </span>
            )}
          </div>
          <span className="block text-[10.5px] text-ink-400 truncate">{drag ? "Отпустите файлы" : hint}</span>
        </div>

        {count > 0 && onView && (
          <button
            className="shrink-0 flex items-center gap-1.5 rounded-lg border border-moss-500/40 bg-moss-500/10 px-2.5 py-1.5 text-[11px] font-bold text-moss-700 hover:bg-moss-500 hover:text-white transition-colors cursor-pointer"
            onClick={(e) => { e.stopPropagation(); onView(); }}
            title="Открыть редактор списка"
          >
            <IconEye size={12} /> Просмотр
          </button>
        )}
      </div>
    </div>
  );
}
