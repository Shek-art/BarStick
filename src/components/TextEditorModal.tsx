import { useState } from "react";
import Modal from "./Modal";
import { countNonEmpty } from "../lib/listCheck";
import { IconCheck } from "./icons";

interface Props {
  title: string;
  initial: string;
  onClose: () => void;
  onSave: (text: string) => void;
}

/** Большое окно редактирования текста списка */
export default function TextEditorModal({ title, initial, onClose, onSave }: Props) {
  const [text, setText] = useState(initial);
  const lines = countNonEmpty(text);
  const dirty = text !== initial;

  return (
    <Modal
      title="Редактор списка"
      subtitle={title}
      onClose={onClose}
      width={860}
      footer={
        <>
          <span className="mr-auto font-mono text-[11px] font-bold text-ink-500">
            строк: <span className={lines > 0 ? "text-moss-700" : "text-ink-300"}>{lines}</span>
          </span>
          <button
            className="px-3.5 py-2 rounded-lg border border-ink-200/80 text-ink-600 text-[12px] font-bold hover:bg-ink-200/40 transition-colors cursor-pointer"
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-moss-600 text-white text-[12px] font-bold hover:bg-moss-500 transition-colors cursor-pointer disabled:opacity-40"
            onClick={() => onSave(text)}
            disabled={!dirty}
            title={dirty ? "Сохранить изменения" : "Нет изменений"}
          >
            <IconCheck size={13} /> Применить
          </button>
        </>
      }
    >
      <div className="p-4">
        <textarea
          className="checker-area editor-big"
          autoFocus
          spellCheck={false}
          placeholder={"Вставьте список…\n1_ Позиция первая\n2_ Позиция вторая"}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <p className="mt-2 text-[10.5px] text-ink-400">
          Каждая строка с новой строки. Первые числа «1_», «2_», … используются для сверки списков.
          Изменения применяются к карточке списка после «Применить» (Esc — отмена).
        </p>
      </div>
    </Modal>
  );
}
