import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { makeOrgApi } from "../api/org";

/**
 * 현재 URL 의 :slug 를 읽어 기관 스코프 API 와 링크 base(`/<slug>`)를 제공.
 * 기관 하위 라우트(공개/관리자)에서 사용.
 */
export function useOrg() {
  const { slug = "" } = useParams();
  const api = useMemo(() => makeOrgApi(slug), [slug]);
  return { slug, base: `/${slug}`, api };
}
