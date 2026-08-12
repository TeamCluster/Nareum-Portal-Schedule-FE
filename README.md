# Nareum-Portal-Schedule-FE

나름청소년활동센터 대관 예약 시스템의 **React + Vite (TypeScript)** 프론트엔드입니다.
백엔드 Flask API(`Nareum-Portal-Schedule`)를 소비합니다.

## 실행
백엔드를 먼저 `http://localhost:8000` 에서 실행한 뒤:
```bash
npm install
npm run dev        # http://localhost:5173
```
개발 모드에서는 Vite 프록시가 `/api`·`/static` 요청을 백엔드로 전달하므로
세션 쿠키가 same-origin으로 동작합니다. (별도 CORS 설정 불필요)

## 빌드
```bash
npm run build      # 타입체크 + 프로덕션 번들 (dist/)
npm run preview
```
프로덕션에서 백엔드가 다른 도메인이면 `.env`에 `VITE_API_BASE`를 설정하고,
백엔드의 `CORS_ORIGINS`·쿠키 설정(SameSite=None, Secure)을 맞춰주세요.

## 구조
```
src/
  api/client.ts     # credentials 포함 fetch 래퍼
  api/types.ts      # API 응답 타입
  lib/              # phone(전화번호 포맷), datetime(예약 기간·포맷)
  components/       # PublicLayout, AdminLayout, RequireAdmin, TimeSlotPicker, ReservationFields
  pages/            # Home, Reserve, Complete, Check
  pages/admin/      # Login, Dashboard, Requests, List, Add, Edit
  styles/           # style.css, admin.css (기존 이식) + extra.css
```

## 라우트
| 경로 | 화면 |
|---|---|
| `/` | 홈 (날짜 선택 + 시설별 예약 현황) |
| `/reserve/:facilityId?date=` | 대관 신청 폼 |
| `/complete/:accessId` | 신청 완료 |
| `/check` | 내 예약 조회/취소 |
| `/manage/login` | 관리자 로그인 |
| `/manage` | 대시보드 (승인 대기 + 일자별 + 캘린더) |
| `/manage/requests` | 승인 요청 (승인/거절) |
| `/manage/list` | 전체 예약 목록 |
| `/manage/add` | 예약 직접 추가 |
| `/manage/edit/:resId` | 예약 수정 |
