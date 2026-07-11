import { Routes, Route } from "react-router-dom";
import PublicLayout from "./components/PublicLayout";
import HomePage from "./pages/HomePage";
import ReservePage from "./pages/ReservePage";
import CompletePage from "./pages/CompletePage";
import CheckPage from "./pages/CheckPage";
import LoginPage from "./pages/admin/LoginPage";
import AdminLayout from "./components/AdminLayout";
import RequireAdmin from "./components/RequireAdmin";
import DashboardPage from "./pages/admin/DashboardPage";
import RequestsPage from "./pages/admin/RequestsPage";
import ListPage from "./pages/admin/ListPage";
import AddPage from "./pages/admin/AddPage";
import EditPage from "./pages/admin/EditPage";

export default function App() {
  return (
    <Routes>
      {/* Public site */}
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="reserve/:facilityId" element={<ReservePage />} />
        <Route path="complete/:accessId" element={<CompletePage />} />
        <Route path="check" element={<CheckPage />} />
      </Route>

      {/* Admin */}
      <Route path="manage/login" element={<LoginPage />} />
      <Route
        path="manage"
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
        <Route path="edit/:resId" element={<EditPage />} />
      </Route>

      <Route path="*" element={<div style={{ padding: 40 }}>페이지를 찾을 수 없습니다.</div>} />
    </Routes>
  );
}
