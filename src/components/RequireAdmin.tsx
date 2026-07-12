import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useOrg } from "../hooks/useOrg";

/**
 * 기관 관리자 라우트 가드.
 * /<slug>/manage/* 진입 시 GET /<slug>/admin/session 으로 로그인 확인 →
 * 미로그인이면 /<slug>/manage/login 으로 리다이렉트. (실제 보호는 백엔드가 담당)
 */
export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { slug, base, api } = useOrg();
  const [state, setState] = useState<"loading" | "ok" | "no">("loading");
  const location = useLocation();

  useEffect(() => {
    let active = true;
    api
      .get<{ logged_in: boolean }>("/admin/session")
      .then((res) => active && setState(res.logged_in ? "ok" : "no"))
      .catch(() => active && setState("no"));
    return () => {
      active = false;
    };
  }, [slug]);

  if (state === "loading") return <div className="spinner" />;
  if (state === "no")
    return <Navigate to={`${base}/manage/login`} replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}
