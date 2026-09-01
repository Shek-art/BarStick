import Modal from "./Modal";
import type { MediaKind } from "../types";
import { IconArrowUp, IconArrowDown, IconReplace, IconTrash, IconImage, IconBarcode } from "./icons";

interface Props {
  kind: MediaKind;
  items: string[];
  onClose: () => void;
  onRemove: (i: number) => void;
  onReplace: (i: number, file: File) => void;
  onMove: (i: number, dir: -1 | 1) => void;
}

/**
 * Редактор списка фото товара / штрихкодов:
 * удаление, замена каждого файла, изменение порядка.
 */
export default function MediaModal({ kind, items, onClose, onRemove, onReplace, onMove }: Props) {
  const isImages = kind === "images";

  return (
    <Modal
      title={isImages ? "Фото товара" : "Штрихкоды"}
      subtitle={`${items.length} шт · порядок в списке = порядок наклеек`}
      onClose={onClose}
      width={600}
    >
      <div className="p-3 flex flex-col gap-2">
        {items.length === 0 && (
          <div className="py-12 flex flex-col items-center gap-3 text-ink-300">
            {isImages ? <IconImage size={30} /> : <IconBarcode size={30} />}
            <p className="text-[13px] font-semibold">Список пуст — загрузите файлы через панель слева</p>
          </div>
        )}

        {items.map((src, i) => (
          <div
            key={`${src.slice(0, 40)}-${i}`}
            className="flex items-center gap-3 rounded-lg border border-ink-200/70 bg-white p-2 pl-2.5 hover:border-moss-500/50 hover:shadow-sm transition-all group"
          >
            <span className="font-mono text-[11px] font-bold text-ink-300 w-6 text-center shrink-0">{i + 1}</span>

            <div className="w-[68px] h-[50px] rounded-md overflow-hidden border border-ink-200/60 bg-paper-2 shrink-0">
              <img
                src={src}
                alt={isImages ? `Фото ${i + 1}` : `Штрихкод ${i + 1}`}
                className={`w-full h-full ${isImages ? "object-cover" : "object-contain bg-white"}`}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-bold text-ink-800">
                {isImages ? `Фото ${i + 1}` : `Штрихкод ${i + 1}`}
              </div>
              <div className="text-[10.5px] text-ink-400 truncate">
                {src.startsWith("data:") ? "обработано · сохраняется в сессии" : "файл текущей сессии"}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button className="icon-btn" title="Выше по списку" disabled={i === 0} onClick={() => onMove(i, -1)}>
                <IconArrowUp size={13} />
              </button>
              <button
                className="icon-btn"
                title="Ниже по списку"
                disabled={i === items.length - 1}
                onClick={() => onMove(i, 1)}
              >
                <IconArrowDown size={13} />
              </button>
              <label className="icon-btn cursor-pointer" title="Заменить файл">
                <IconReplace size={13} />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onReplace(i, f);
                    e.target.value = "";
                  }}
                />
              </label>
              <button className="icon-btn danger" title="Удалить" onClick={() => onRemove(i)}>
                <IconTrash size={13} />
              </button>
            </div>
          </div>
        ))}

        {items.length > 0 && (
          <p className="text-[10.5px] text-ink-400 px-1 pt-1">
            Позиция в списке привязывается к строке наклейки с тем же номером. Замена файла обновляет наклейку мгновенно.
          </p>
        )}
      </div>
    </Modal>
  );
}
