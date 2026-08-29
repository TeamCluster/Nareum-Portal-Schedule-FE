// Cloudflare Pages Advanced Mode worker.
// dev 의 vite proxy 와 같은 역할: /api 와 /static 을 백엔드로 넘겨 SPA 와 API 가
// 같은 오리진을 쓰게 한다. (→ CORS 불필요, 세션 쿠키가 same-site 로 동작)
// 백엔드 주소는 Pages 대시보드의 환경 변수 BACKEND_ORIGIN 으로 지정한다.
//   예) BACKEND_ORIGIN = https://api.example.com

const PROXY_PATH = /^\/(api|static)(\/|$)/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (env.BACKEND_ORIGIN && PROXY_PATH.test(url.pathname)) {
      const target = new URL(url.pathname + url.search, env.BACKEND_ORIGIN);
      const proxied = new Request(target, request);
      // Flask 의 FORCE_HTTPS·url_for 가 원래 호스트를 보게 한다.
      proxied.headers.set("X-Forwarded-Host", url.host);
      proxied.headers.set("X-Forwarded-Proto", url.protocol.replace(":", ""));
      return fetch(proxied);
    }

    return env.ASSETS.fetch(request);
  },
};
