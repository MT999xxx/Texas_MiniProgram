import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Reservations from './pages/Reservations';
import Tables from './pages/Tables';
import Menu from './pages/Menu';
import Members from './pages/Members';
import Orders from './pages/Orders';
import MainLayout from './components/Layout/MainLayout';
import AuthRoute from './components/AuthRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 登录页（无需布局） */}
        <Route path="/login" element={<Login />} />

        {/* 主应用（带布局和权限保护） */}
        <Route
          path="/"
          element={
            <AuthRoute>
              <MainLayout />
            </AuthRoute>
          }
        >
          {/* 重定向根路径到dashboard */}
          <Route index element={<Navigate to="/dashboard" replace />} />

          {/* Dashboard */}
          <Route path="dashboard" element={<Dashboard />} />

          {/* P1 - 预约与桌位 */}
          <Route path="reservations" element={<Reservations />} />
          <Route path="tables" element={<Tables />} />

          {/* P2 - 菜单、会员、订单 */}
          <Route path="menu" element={<Menu />} />
          <Route path="members" element={<Members />} />
          <Route path="orders" element={<Orders />} />

          {/* TODO: Settings */}
          <Route path="settings" element={<div style={{ padding: 24, background: '#fff' }}>系统设置页面（待开发）</div>} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
