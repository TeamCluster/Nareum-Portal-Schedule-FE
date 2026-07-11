import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api } from "../api/client";

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"loading" | "ok" | "no">("loading");
  const location = useLocation();

  useEffect(() => {
    let active = true;
    api
      .get<{ logged_in: boolean }>("/admin/me")
      .then((res) => active && setState(res.logged_in ? "ok" : "no"))
      .catch(() => active && setState("no"));
    return () => {
      active = false;
    };
  }, []);

  if (state === "loading") return <div className="spinner" />;
  if (state === "no")
    return <Navigate to="/manage/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}
