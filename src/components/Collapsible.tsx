import { ReactNode, useState } from "react";

/** 제목 헤더를 눌러 내용을 접고 펼치는 섹션. 기본은 접힘. */
export default function Collapsible({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: ReactNode;
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="collapsible">
      <button type="button" className="collapsible-head" onClick={() => setOpen((o) => !o)}>
        <span className="collapsible-caret">{open ? "▾" : "▸"}</span>
        <span className="collapsible-title">{title}</span>
        {count != null && <span className="collapsible-count">{count}건</span>}
      </button>
      {open && <div className="collapsible-body">{children}</div>}
    </div>
  );
}
