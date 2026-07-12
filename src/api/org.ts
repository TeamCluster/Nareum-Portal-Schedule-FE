// 기관(slug) 스코프 API. 모든 경로 앞에 /<slug> 를 자동으로 붙인다.
import { api } from "./client";

export function makeOrgApi(slug: string) {
  const p = (sub: string) => `/${slug}${sub}`;
  return {
    get: <T>(sub: string) => api.get<T>(p(sub)),
    post: <T>(sub: string, body?: unknown) => api.post<T>(p(sub), body),
    put: <T>(sub: string, body?: unknown) => api.put<T>(p(sub), body),
    del: <T>(sub: string, body?: unknown) => api.del<T>(p(sub), body),
  };
}

export type OrgApi = ReturnType<typeof makeOrgApi>;
