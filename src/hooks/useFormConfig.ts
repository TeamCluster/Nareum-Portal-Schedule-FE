import { useEffect, useState } from "react";
import { useOrg } from "./useOrg";
import type { FormConfig } from "../api/types";

const EMPTY: FormConfig = { equipment_catalog: [], notice: [], rules: [] };

/**
 * 기관의 신청서 설정(필요 물품 목록·공지·대관규정)을 불러온다.
 *
 * admin=true 면 관리자 엔드포인트를 써서 시설 유형 필터 없이 전체를 받는다
 * (관리자는 어떤 시설이든 예약을 추가/수정할 수 있으므로).
 */
export function useFormConfig(admin = true): FormConfig {
  const { slug, api } = useOrg();
  const [cfg, setCfg] = useState<FormConfig>(EMPTY);

  useEffect(() => {
    api
      .get<FormConfig>(admin ? "/admin/form-config" : "/form-config")
      .then(setCfg)
      .catch(() => setCfg(EMPTY));
  }, [slug, admin]);

  return cfg;
}
