import { useEffect } from "react";
import type { ReactNode } from "react";
import { IconX } from "./icons";

interface Props {
  title: string;
  subtitle?: string;
  width?: number;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/** Общая оболочка модальных окон приложения */
export default function Modal({ title, subtitle, width = 640, onClose, children, footer }: Props) {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  return (
    <div className="no-print fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/72 pop-in" onMouseDown={onClose} />
      <div
        className="pop-in relative w-full bg-paper border border-ink-200/80 rounded-xl shadow-[0_32px_80px_rgba(8,14,10,0.55)] overflow-hidden flex flex-col text-ink-900"
        style={{ maxWidth: width, maxHeight: "88vh" }}
      >
        <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-ink-200/60 bg-paper-2 shrink-0">
          <div>
            <h2 className="font-display text-[15px] font-bold text-ink-900">{title}</h2>
            {subtitle && <p className="text-[11.5px] text-ink-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            className="cursor-pointer rounded-md p-1.5 text-ink-400 hover:text-rust hover:bg-rust/10 transition-colors"
            onClick={onClose}
            title="Закрыть (Esc)"
          >
            <IconX size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto nice-scroll">{children}</div>

        {footer && (
          <div className="shrink-0 border-t border-ink-200/60 bg-paper-2 px-5 py-3 flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
