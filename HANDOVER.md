# 인수인계 문서 — 프론트엔드 (Nareum-Portal-Schedule-FE)

> 대관 예약 시스템의 **React + Vite (TypeScript)** 프론트엔드. **멀티테넌트** SPA.
> 백엔드(`../Nareum-Portal-Schedule`, Flask 멀티테넌트 API)를 소비.

## 1. 개요 & 역할
세 영역으로 구성됩니다.
- **슈퍼 관리자**(`/super`): 기관 추가/삭제, 기관별 관리자 비밀번호 관리, 슈퍼 비번 변경.
- **기관 관리자**(`/:slug/manage/*`): 자기 기관의 예약 승인/관리·시설 CRUD.
- **예약 신청자(공개)**(`/:slug`): 로그인 없이 예약 신청·조회.

## 2. 멀티테넌트 라우팅 (App.tsx)
URL 의 `:slug` 가 기관을 식별합니다. **BrowserRouter** 사용 → 배포 시 SPA fallback 필요(모든 경로를 index.html 로 rewrite).
```
/                          안내 페이지(LandingPage)
/super/login               슈퍼 로그인
/super                     기관 관리(RequireSuper → SuperLayout → PlacesPage)
/:slug                     공개 예약 홈 (PublicLayout)
/:slug/reserve/:facilityId · /:slug/complete/:accessId · /:slug/check
/:slug/manage/login        기관 관리자 로그인
/:slug/manage              대시보드 (RequireAdmin → AdminLayout)
  └ requests · list · add · facilities · operating · settings · form-settings · edit/:resId
```

## 3. slug 스코프 API — 핵심 패턴
- **`src/hooks/useOrg.ts`**: URL 의 `:slug` 를 읽어 `{ slug, base, api }` 반환.
  - `base` = `/${slug}` — 화면 내 `<Link to>` / `navigate` 앞에 붙이는 접두사.
  - `api` = slug 를 자동으로 붙이는 스코프 API(`src/api/org.ts`). 페이지는 `api.get("/availability")` 처럼 **상대 경로**만 쓰면 `/api/<slug>/availability` 로 요청됨.
- **`src/api/super.ts`**: 슈퍼 전용 API(`superApi.login/listPlaces/addPlace/...`) — `/api/super/...`.
- **`src/api/client.ts`**: 저수준 fetch 래퍼(`credentials:"include"`, `{error}`→ApiError). `get/post/put/del` 제공. 모든 경로 앞에 `/api` 자동 부착.

> 새 기관 화면을 추가할 때: 페이지에서 `const { base, api } = useOrg()` → `api.*` 로 호출, 링크는 `` `${base}/...` `` 로.

## 4. 인증 가드
- **RequireAdmin**: `/:slug/manage/*` 진입 시 `GET /:slug/admin/session` 확인 → 미로그인 시 `/:slug/manage/login`.
- **RequireSuper**: `GET /super/session` → 미로그인 시 `/super/login`.
- 클라이언트 가드는 UX 용이고 **실제 보호는 백엔드 데코레이터**가 담당(API 401).

## 5. 레이아웃
- **PublicLayout**: `GET /:slug/info` 로 기관 풀네임/연락처를 받아 헤더 로고·푸터에 표시. 없는 slug 면 "기관을 찾을 수 없습니다".
- **AdminLayout**: 기관 short_name 표시, slug 접두 nav(대시보드/승인요청/목록/직접추가/시설관리/운영설정/**신청서설정**/기관정보), 로그아웃.
- **SuperLayout**: 슈퍼 콘솔 헤더(슈퍼 비번 변경 모달·로그아웃).

## 6. 디렉터리
```
src/
  api/ client.ts · org.ts(slug 스코프) · super.ts · types.ts(★API 계약)
  hooks/ useOrg.ts
  components/ PublicLayout · AdminLayout · SuperLayout · RequireAdmin · RequireSuper
              TimeSlotPicker · ReservationFields (신청서 항목 공용, slug 무관)
              AttendanceControls (이용 결과 기록 + 현장 연장)
              ClubPicker (동아리 선택 + 직접 입력)
  lib/ ... recurringKinds.ts(정기활동 유형 라벨 — 단일 출처)
  hooks/ useOrg.ts · useFormConfig.ts(기관 신청서 설정)
  pages/ Landing, Home, Reserve, Complete, Check
  pages/admin/ Login, Dashboard, Requests, List, Add, Edit, Facilities,
               Operating(운영시간·휴무일·정기활동·대관 규칙), Settings,
               FormSettings(신청서 설정)
  pages/super/ Login, Places, Holidays
  lib/ phone.ts · datetime.ts · facilityTypes.tsx · reservationForm.ts(인원·물품 표기)
  styles/ style.css · admin.css · extra.css
```

## 7. 백엔드와의 계약
- `src/api/types.ts` = API 계약. 백엔드 서비스 응답이 바뀌면 여기부터 동기화.
- 필드는 백엔드 직렬화와 1:1(`applicant_name`, `participant_info`, `access_id`, `Place`, `PlaceInfo` 등).
- 예약 규칙(2시간·주간제한 등)은 서버가 최종 검증. 프론트 검증은 UX 보조.
- **신청서 항목은 종이 「시설대관이용신청서」와 1:1**(2026-08 반영):
  이름·나이·연락처·주소/E-Mail·학교/소속·동아리·**활동내용**·이용인원(연령×**남/여**)·필요 물품(수량 포함).
  - `participant_info` 는 `{연령대: {male, female, unspecified}}`. `unspecified` 는 성별 구분
    도입 전 데이터를 손실 없이 표시하기 위한 레거시 버킷이라 입력 UI 에는 없다.
  - `requested_equipment` 는 `[{name, qty}]`(옛 `string[]` 아님) — 종이의 '마이크 ( )대' 때문.
  - 인원·물품 표기는 `lib/reservationForm.ts` 의 `participantSummary`/`equipmentSummary` 로 통일.
- **정기 고정활동은 유형(`kind`)을 함께 보낸다** — `club`(동아리) / `program`(프로그램) /
  `etc`(점검·외부 정기대관 등). 활동명은 필수. `club` 이면 `ClubPicker` 로, 나머지는
  텍스트 입력으로 받는다. 라벨·placeholder 는 `lib/recurringKinds.ts` 에서만 정의할 것.
- **동아리 목록은 백엔드 프록시로만** — `GET /:slug/admin/clubs` (`ClubList`).
  외부 도메인(clublog)을 프론트에서 직접 호출하지 말 것(CORS·인증 경계).
  `available:false` 로 내려올 수 있으므로 `components/ClubPicker.tsx` 는 목록이 없어도
  직접 입력으로 진행 가능해야 한다. '예약 직접 추가'(AddPage)의 **동아리 단기대관** 탭이 사용.
- **대관 규칙(숫자값)도 기관별 설정** — `GET·PUT /:slug/admin/booking-rules`
  (`BookingRules`: 최소 신청 기한·예약 가능 범위·취소 마감·재대관 제한 개월·현장 연장 시간).
  화면에 규칙을 중복 구현하지 말 것: 취소 가능 여부는 서버가 `can_cancel`·`cancel_deadline`
  으로 내려주고, 연장·이용 결과는 전용 엔드포인트가 판정한다.
  - `attendance`(`''`|`attended`|`no_show`|`unverified`) 는 재대관 제한의 근거.
    `components/AttendanceControls.tsx` 가 기록·연장 버튼을 담당(대시보드·예약 수정 공용).
- **필요 물품 목록·공지·대관규정은 기관별 설정**(`GET /:slug/form-config`,
  관리자는 `GET·PUT /:slug/admin/form-config`). 코드 상수가 아니므로 화면에서 하드코딩 금지.
  공개 조회는 `?facility_type=` 으로 해당 시설 유형에 맞는 물품 분류만 받는다.

## 8. 알려진 한계 / 향후 과제 (TODO)
- [ ] 푸터 연락처는 이제 기관별 DB(주소/전화/이메일)에서 옴 — 슈퍼 페이지에서 기관 추가 시 입력. 기존 기관 정보 수정 UI(PUT /super/places/<slug>)는 백엔드만 있고 화면 미구현.
- [ ] `alert()`/`confirm()` 사용(개선 여지: 토스트/모달).
- [ ] 시설 이미지 업로드 없음(경로 문자열 입력만).
- [ ] 자동화 테스트 없음(Vitest 도입 권장).
- [ ] FullCalendar 포함으로 초기 JS 다소 큼(관리자 라우트 code-splitting 여지).
