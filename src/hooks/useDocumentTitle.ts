import { useEffect } from "react";

/**
 * 문서 제목(브라우저 탭)과 og:title 메타를 동기화한다.
 * 페이지/기관 컨텍스트에 맞는 제목을 넘기면 된다. 빈 값이면 갱신하지 않는다
 * (기관 정보 로딩 전 깜빡임 방지).
 */
export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    if (!title) return;
    document.title = title;

    let meta = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("property", "og:title");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", title);
  }, [title]);
}
