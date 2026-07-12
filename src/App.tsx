import { Routes, Route } from "react-router-dom";
import PublicLayout from "./components/PublicLayout";
import AdminLayout from "./components/AdminLayout";
import SuperLayout from "./components/SuperLayout";
import RequireAdmin from "./components/RequireAdmin";
import RequireSuper from "./components/RequireSuper";

import LandingPage from "./pages/LandingPage";
import HomePage from "./pages/HomePage";
import ReservePage from "./pages/ReservePage";
import CompletePage from "./pages/CompletePage";
import CheckPage from "./pages/CheckPage";

import LoginPage from "./pages/admin/LoginPage";
import DashboardPage from "./pages/admin/DashboardPage";
import RequestsPage from "./pages/admin/RequestsPage";
import ListPage from "./pages/admin/ListPage";
import AddPage from "./pages/admin/AddPage";
import EditPage from "./pages/admin/EditPage";
import FacilitiesPage from "./pages/admin/FacilitiesPage";

import SuperLoginPage from "./pages/super/LoginPage";
import SuperPlacesPage from "./pages/super/PlacesPage";

/*
 * 라우터 — 멀티테넌트.
 *
 * 루트:
 *   /                         안내 페이지
 *
 * 슈퍼 관리자:
 *   /super/login              슈퍼 로그인
 *   /super                    기관 관리 (CRUD)
 *
 * 기관별 (slug 기반):
 *   /:slug                    공개 예약 홈
 *   /:slug/reserve/:facilityId  대관 신청 폼
 *   /:slug/complete/:accessId   신청 완료
 *   /:slug/check              내 예약 확인
 *   /:slug/manage/login       기관 관리자 로그인
 *   /:slug/manage             대시보드
 *   /:slug/manage/requests|list|add|facilities|edit/:resId
 */
export default function App() {
  return (
    <Routes>
      <Route index element={<LandingPage />} />

      {/* 슈퍼 관리자 */}
      <Route path="super/login" element={<SuperLoginPage />} />
      <Route
        path="super"
        element={
          <RequireSuper>
            <SuperLayout />
          </RequireSuper>
        }
      >
        <Route index element={<SuperPlacesPage />} />
      </Route>

      {/* 기관 관리자 로그인 (레이아웃 밖) */}
      <Route path=":slug/manage/login" element={<LoginPage />} />

      {/* 기관 관리자 (보호) */}
      <Route
        path=":slug/manage"
        element={
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="requests" element={<RequestsPage />} />
        <Route path="list" element={<ListPage />} />
        <Route path="add" element={<AddPage />} />
        <Route path="facilities" element={<FacilitiesPage />} />
        <Route path="edit/:resId" element={<EditPage />} />
      </Route>

      {/* 기관 공개 */}
      <Route path=":slug" element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="reserve/:facilityId" element={<ReservePage />} />
        <Route path="complete/:accessId" element={<CompletePage />} />
        <Route path="check" element={<CheckPage />} />
      </Route>

      <Route path="*" element={<div style={{ padding: 40 }}>페이지를 찾을 수 없습니다.</div>} />
    </Routes>
  );
}
