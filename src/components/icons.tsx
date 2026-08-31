import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 15, ...rest }: P) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.1,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...rest,
  };
}

export const IconPrint = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

export const IconPdf = (p: P) => (
  <svg {...base(p)}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6M9 15v-2.5h1.2a1.3 1.3 0 0 1 0 2.6H9zM14 12.5V17m0-2.3h2m-2-2.2h1.6" />
  </svg>
);

export const IconZip = (p: P) => (
  <svg {...base(p)}>
    <path d="M21 8v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8" />
    <path d="M1 3h22v5H1zM10 12h4" />
  </svg>
);

export const IconReset = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

export const IconSpark = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 2l2.1 6.1L20 10l-5.9 1.9L12 18l-2.1-6.1L4 10l5.9-1.9z" />
    <path d="M19 17l.9 2.6L22 20l-2.1.9L19 23l-.9-2.1L16 20l2.1-.4z" strokeWidth="1.6" />
  </svg>
);

export const IconUpload = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 9l5-5 5 5M12 4v12" />
  </svg>
);

export const IconImage = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
);

export const IconBarcode = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 5v14M7 5v14M10 5v10M13 5v14M17 5v10M21 5v14" strokeWidth="2" />
  </svg>
);

export const IconX = (p: P) => (
  <svg {...base(p)}>
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

export const IconCheck = (p: P) => (
  <svg {...base(p)}>
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

export const IconAlert = (p: P) => (
  <svg {...base(p)}>
    <path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01" />
  </svg>
);

export const IconMinus = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 12h14" />
  </svg>
);

export const IconPlus = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconWinMin = (p: P) => (
  <svg {...base(p)} strokeWidth="1.8">
    <path d="M5 12h14" />
  </svg>
);

export const IconWinMax = (p: P) => (
  <svg {...base(p)} strokeWidth="1.8">
    <rect x="5" y="5" width="14" height="14" rx="1.5" />
  </svg>
);

export const IconWinClose = (p: P) => (
  <svg {...base(p)} strokeWidth="1.8">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const IconInfo = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </svg>
);

export const IconLayers = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
  </svg>
);

/** Фирменный знак «4K» */
export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden>
      <rect width="512" height="512" rx="118" fill="#1E7A48" />
      <g transform="rotate(-18 256 268)">
        <path d="M150 176 L326 176 L382 268 L326 360 L150 360 Z" fill="#F5F7F2" />
        <circle cx="196" cy="268" r="24" fill="#1E7A48" />
        <g fill="#141d17">
          <rect x="238" y="216" width="10" height="104" />
          <rect x="256" y="216" width="5" height="104" />
          <rect x="270" y="216" width="14" height="104" />
          <rect x="292" y="216" width="5" height="104" />
          <rect x="305" y="216" width="10" height="104" />
        </g>
      </g>
    </svg>
  );
}

/** Логотип поставщика внутри печатной наклейки */
export function SupplierLogo() {
  return (
    <svg width="130" height="34" viewBox="0 0 130 34" aria-hidden>
      <rect x="0" y="2" width="30" height="30" rx="7" fill="#1E7A48" />
      <text x="15" y="24" textAnchor="middle" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="15" fill="#ffffff">
        4K
      </text>
      <text x="38" y="24" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="19" fill="#1E7A48">
        green
      </text>
      <rect x="38" y="27" width="52" height="3" rx="1.5" fill="#3ECF7A" />
    </svg>
  );
}
