# 인수인계 문서 — 프론트엔드 (Nareum-Portal-Schedule-FE)

> 나름청소년활동센터 대관 예약 시스템의 **React + Vite (TypeScript)** 프론트엔드.
> 이 문서는 프로젝트를 이어받는 개발자를 위한 배경·설계 결정·주의사항 정리입니다.
> 실행/라우트 요약은 [README.md](README.md) 참고.

## 1. 개요
- 백엔드 Flask REST API(`../Nareum-Portal-Schedule`)를 소비하는 SPA.
- 기존 Jinja 템플릿 + 바닐라 JS로 렌더링되던 화면을 React 컴포넌트로 이식한 결과물.
- 공개 사이트(예약)와 관리자 페이지(승인/관리) 두 영역으로 구성.

## 2. 기술 스택 & 선택 이유
| 기술 | 이유 |
|---|---|
| **React 18 + Vite 5** | 빠른 개발 서버·번들, 표준적인 SPA 구성 |
| **TypeScript** | 예약 도메인은 필드가 많아 API 계약을 타입으로 고정(컴파일 단계 오류 방지) |
| **react-router-dom v6** | 클라이언트 라우팅 |
| **@fullcalendar/react** | 관리자 주간 캘린더 — 기존 템플릿이 쓰던 FullCalendar를 그대로 계승 |
| 별도 상태관리 라이브러리 없음 | 화면 지역 상태(`useState`)로 충분. 전역 상태 필요해지면 Context/Zustand 검토 |
| 별도 폼 라이브러리 없음 | 제어 컴포넌트로 직접 관리 |

## 3. 디렉터리 구조 & 책임
```
src/
  api/
    client.ts        # fetch 래퍼(credentials 포함), API_BASE, assetUrl(), ApiError
    types.ts         # ★ 백엔드 응답 타입 = API 계약. 백엔드 바뀌면 여기부터 수정
  lib/
    phone.ts         # 한국 전화번호 자동 포맷(기존 common.js 이식)
    datetime.ts      # 예약 가능기간(KST) 계산, 날짜/시간 포맷 헬퍼
  components/
    PublicLayout.tsx     # 공개 헤더/푸터 래퍼
    AdminLayout.tsx      # 관리자 사이드바 레이아웃 + 로그아웃
    RequireAdmin.tsx     # 인증 가드(/admin/me 확인 후 미로그인 시 로그인으로)
    TimeSlotPicker.tsx   # ★ 시간 슬롯 선택 UI(공개/관리자 공용)
    ReservationFields.tsx# 신청인/인원/장비 공통 필드(add·edit 공용)
  pages/               # Home, Reserve, Complete, Check
  pages/admin/         # Login, Dashboard, Requests, List, Add, Edit
  styles/
    style.css, admin.css # 기존 디자인 이식(변경 최소화)
    extra.css            # React 이식 과정에서 추가된 폼/모달/스피너/테이블 스타일
```

## 4. 핵심 설계 결정 (꼭 알아둘 것)

### 4-1. API 통신은 `src/api/client.ts` 단일 창구
- 모든 요청은 `api.get/post/put`을 통해서만. `credentials: "include"`로 세션 쿠키 자동 전송.
- 실패 응답의 `{error}` 필드를 `ApiError.message`로 던짐 → 각 페이지에서 사용자 메시지로 노출.
- `API_BASE`는 `VITE_API_BASE`(기본 빈 문자열). 개발에선 비워두고 **Vite 프록시** 사용, 운영에서 백엔드가 다른 도메인이면 설정.
- 시설 이미지 등 정적 자원은 `assetUrl(path)`로 `API_BASE + path` 조합.

### 4-2. 개발 시 Vite 프록시 (vite.config.ts)
- `/api`, `/static` 요청을 `http://localhost:5000`으로 프록시 → 브라우저 입장에선 same-origin → **세션 쿠키가 문제없이 붙음**(cross-site 쿠키 설정 불필요).
- 그래서 개발 중 CORS 이슈가 없음. 백엔드도 CORS를 켜두긴 했으나 프록시 경로에선 사용되지 않음.

### 4-3. 인증 가드 (RequireAdmin.tsx)
- `/manage/*` 진입 시 `GET /api/admin/me`로 로그인 여부 확인 → 미로그인이면 `/manage/login`으로 리다이렉트.
- 클라이언트 가드일 뿐 **실제 보호는 백엔드 `@admin_required`가 담당**(API가 401 반환). 프론트 가드는 UX용.

### 4-4. TimeSlotPicker — 두 가지 모드
- **공개(reserve)**: `maxHours={2}` — 개별 토글, 최대 2개, 2개일 때 연속만 허용(초과/불연속 시 alert 후 되돌림). 기존 `reserve.js` 로직 이식.
- **관리자(add/edit)**: `autoFillRange` — 클릭 지점까지 연속 구간 자동 채움, 사이에 마감 슬롯 있으면 alert. 기존 관리자 인라인 스크립트 이식.
- 마감(booked) 슬롯은 백엔드 `booked-times`로 받아 비활성.

## 5. 라우팅 (App.tsx)
- **BrowserRouter** 사용 → 배포 시 SPA fallback 필요: 서버(nginx 등)가 모든 경로를 `index.html`로 rewrite 해야 새로고침/딥링크가 동작. (Vite dev 서버는 자동 처리)
- 공개: `/`, `/reserve/:facilityId?date=`, `/complete/:accessId`, `/check`
- 관리자: `/manage/login`, `/manage`(대시보드), `/manage/requests|list|add|edit/:resId`

## 6. 스타일
- 기존 `style.css`·`admin.css`를 거의 그대로 가져와 원본 디자인 유지(색 변수 `--primary-color` 등 그대로).
- 템플릿에만 있던 폼/그리드/모달/스피너/상태 pill 등은 `extra.css`에 신규 작성(기존 디자인 토큰 재사용).
- 폰트는 CSS `@import`로 Pretendard CDN 로드(style.css 상단).

## 7. 알려진 한계 / 향후 과제 (TODO)
- [ ] **푸터 정보가 placeholder** — [PublicLayout.tsx](src/components/PublicLayout.tsx)의 주소/전화/이메일을 실제 센터 정보로 교체 필요.
- [ ] `alert()`/`confirm()`을 그대로 사용(기존 UX 계승). 토스트/모달로 개선 여지.
- [ ] `via.placeholder.com` 폴백 이미지 참조(HomePage) — 외부 의존, 필요 시 로컬 자산으로 대체.
- [ ] 접근성(aria)·키보드 조작 보강 여지(특히 TimeSlotPicker는 div 클릭 기반).
- [ ] 자동화 테스트 없음(Vitest + Testing Library 도입 권장).
- [ ] 번들에 FullCalendar 포함되어 초기 JS가 다소 큼(약 130KB gzip). 관리자 라우트 code-splitting으로 최적화 가능.

## 8. 백엔드와의 계약 (중요)
- `src/api/types.ts`가 곧 API 계약. **백엔드 응답 형태가 바뀌면 이 파일부터 동기화**.
- 필드 이름은 백엔드 `to_dict()`와 1:1. 예: `applicant_name`, `participant_info`, `requested_equipment`, `access_id`.
- 예약 생성/수정 요청 바디: `{facility_id, date, hours[], name, contact, school, club, participants{}, equipment[], (status/reject_reason는 edit만)}`.
- 백엔드 도메인 규칙(2시간·주간제한 등)은 서버가 최종 검증하므로, 프론트 검증은 UX 보조일 뿐 신뢰 경계가 아님.

## 9. 자주 하게 될 작업 가이드
- **새 API 화면 추가**: types.ts에 타입 → `api.*` 호출 → 페이지 컴포넌트 → App.tsx 라우트 등록.
- **필드 추가**: 백엔드 모델/`to_dict` → 여기 types.ts → 해당 폼(Reserve/Add/Edit + ReservationFields).
- **예약 규칙 문구 변경**: 대부분 백엔드 메시지를 그대로 노출하므로 백엔드 `helpers.py` 수정. 프론트 하드코딩 문구는 각 페이지의 안내 텍스트 정도.
