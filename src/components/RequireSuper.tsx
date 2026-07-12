import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { superApi } from "../api/super";

/**
 * 슈퍼 관리자 라우트 가드. 미로그인 시 /super/login 으로 리다이렉트.
 */
export default function RequireSuper({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"loading" | "ok" | "no">("loading");

  useEffect(() => {
    let active = true;
    superApi
      .getSession()
      .then((res) => active && setState(res.logged_in ? "ok" : "no"))
      .catch(() => active && setState("no"));
    return () => {
      active = false;
    };
  }, []);

  if (state === "loading") return <div className="spinner" />;
  if (state === "no") return <Navigate to="/super/login" replace />;
  return <>{children}</>;
}
