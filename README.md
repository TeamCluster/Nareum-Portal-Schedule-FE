# Nareum-Portal-Schedule-FE

대관 예약 시스템의 **React + Vite (TypeScript)** 프론트엔드. **멀티테넌트** SPA 입니다.
백엔드 Flask API(`Nareum-Portal-Schedule`)를 소비합니다.

세 영역으로 구성됩니다.

| 영역 | 경로 | 인증 |
|---|---|---|
| 예약 신청자(공개) | `/:slug` | 없음 |
| 기관 관리자 | `/:slug/manage/*` | 기관별 비밀번호 |
| 슈퍼 관리자 | `/super/*` | 슈퍼 비밀번호 |

URL 의 `:slug` 가 기관을 식별합니다(예: `/nareum`). 설계 배경과 상세는
[HANDOVER.md](HANDOVER.md) 를 보세요.

## 실행
백엔드를 먼저 `http://localhost:8000` 에서 실행한 뒤:
```bash
npm install
npm run dev        # http://localhost:5173
```
개발 모드에서는 Vite 프록시가 `/api`·`/static` 요청을 백엔드로 전달하므로
세션 쿠키가 same-origin 으로 동작합니다. (별도 CORS 설정 불필요)

## 빌드
```bash
npm run build      # 타입체크(tsc -b) + 프로덕션 번들 (dist/)
npm run preview
```

## Cloudflare Pages 배포
`public/_worker.js` 가 dev 의 vite proxy 와 같은 역할을 합니다 — `/api`·`/static` 을
백엔드로 프록시해서 SPA 와 API 가 **같은 오리진**을 쓰게 합니다.
따라서 CORS 설정도, 크로스사이트 쿠키(SameSite=None) 설정도 필요 없습니다.

1. 빌드 산출물 `dist/` 를 업로드 (또는 Git 연동 시 build command `npm run build`,
   output directory `dist`). `public/` 의 파일은 빌드 시 `dist/` 로 복사됩니다.
2. Pages 프로젝트 → **Settings → Variables and Secrets** 에서 런타임 변수 추가:
   | 이름 | 값 |
   |---|---|
   | `BACKEND_ORIGIN` | `https://api.example.com` (백엔드 실제 주소, 경로 없이) |
3. `VITE_API_BASE` 는 **비워둡니다.** (설정하면 프록시를 우회해 다시 CORS 가 필요해짐)
4. 백엔드는 `SESSION_COOKIE_SECURE=true`, `SESSION_COOKIE_SAMESITE=Lax`,
   **`TRUSTED_PROXY_HOPS=1`** 로 둡니다. 마지막 값을 빠뜨리면 Secure 쿠키와
   로그인 시도 제한이 모두 오작동합니다. (백엔드 `docs/배포-가이드.md` 참고)

`BACKEND_ORIGIN` 은 재빌드 없이 대시보드에서 바꿀 수 있으므로, 백엔드 도메인을
소스에 하드코딩할 필요가 없습니다. 변수를 바꾼 뒤에는 **재배포(Retry deployment)** 를
한 번 해야 적용됩니다.

`_routes.json` 은 워커가 `/api`·`/static` 요청에만 실행되도록 제한합니다. 정적 파일과
SPA 라우트는 CDN 이 직접 응답하며, `404.html` 이 없으므로 Pages 가 매칭되지 않는
경로를 `index.html` 로 넘겨 BrowserRouter 가 처리합니다.

## 구조
```
src/
  api/client.ts       # credentials 포함 fetch 래퍼 (+ 업로드 사전 검증)
  api/org.ts          # 기관 스코프 API — 경로 앞에 /<slug> 자동 부착
  api/super.ts        # 슈퍼 전용 API (/api/super/...)
  api/types.ts        # API 응답 타입
  hooks/useOrg.ts     # URL 의 :slug 로 { slug, base, api } 제공
  hooks/useDocumentTitle.ts
  lib/                # phone, datetime, operatingHours, facilityTypes
  components/         # PublicLayout · AdminLayout · SuperLayout,
                      # RequireAdmin · RequireSuper (라우트 가드),
                      # TimeSlotPicker, ReservationFields, BookingCalendar,
                      # WeekGrid, Collapsible
  pages/              # Landing, Home, Reserve, Complete, Check
  pages/admin/        # Login, Dashboard, Requests, List, Add, Edit,
                      # Facilities, Operating, Settings
  pages/super/        # Login, Places, Holidays
  styles/             # style.css, admin.css, home.css, extra.css
public/
  _worker.js          # Cloudflare Pages 프록시 (/api·/static → 백엔드)
  _routes.json        # 워커 실행 범위 제한
```

### slug 스코프 API 패턴
기관 하위 페이지는 `useOrg()` 가 주는 `api` 를 씁니다. 상대 경로만 쓰면
`/api/<slug>/...` 로 나갑니다.

```ts
const { slug, base, api } = useOrg();
api.get("/availability");        // → GET /api/nareum/availability
<Link to={`${base}/check`} />    // → /nareum/check
```

## 라우트
| 경로 | 화면 |
|---|---|
| `/` | 안내 페이지 (기관 주소로 접속하도록 안내) |
| **공개 (기관)** | |
| `/:slug` | 홈 (날짜 선택 + 시설별 예약 현황) |
| `/:slug/reserve/:facilityId?date=` | 대관 신청 폼 |
| `/:slug/complete/:accessId` | 신청 완료 |
| `/:slug/check` | 내 예약 조회/취소 |
| **기관 관리자** | |
| `/:slug/manage/login` | 관리자 로그인 |
| `/:slug/manage` | 대시보드 (승인 대기 + 일자별 + 주간 + 캘린더) |
| `/:slug/manage/requests` | 승인 요청 (승인/거절) |
| `/:slug/manage/list` | 전체 예약 목록 |
| `/:slug/manage/add` | 예약 직접 추가 |
| `/:slug/manage/edit/:resId` | 예약 수정 |
| `/:slug/manage/facilities` | 시설 CRUD (이미지 업로드 포함) |
| `/:slug/manage/operating` | 운영시간·휴무일·정기 고정활동 |
| `/:slug/manage/settings` | 기관 표시명·연락처 |
| **슈퍼 관리자** | |
| `/super/login` | 슈퍼 로그인 |
| `/super` | 기관 CRUD·비밀번호·헤더 로고 |
| `/super/holidays` | 공통 휴무일/공휴일 (한국 공휴일 자동 동기화) |

## 알아둘 것
- **예약 취소에는 본인 확인이 필요합니다.** `POST /:slug/reservations/:id/cancel` 은
  body 에 조회에 쓴 `name`·`contact` 를 함께 보내야 합니다(CheckPage 가 처리).
- **이미지 업로드는 5MB·png/jpg/gif/webp 제한**입니다. `validateImageFile()` 로
  보내기 전에 거르며, 서버도 매직 바이트로 다시 검증합니다.
- `RequireAdmin`·`RequireSuper` 는 **UX 용 가드**입니다. 실제 접근 제어는 백엔드가
  세션으로 수행합니다.
