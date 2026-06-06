import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Delivery from "./pages/orders/Delivery";
import TablesPage from "./pages/tables/TablesPage";
import Cashier from "./pages/cashier/Cashier";
import CashClosing from "./pages/cashier/CashClosing";
import ClosingHistory from "./pages/cashier/ClosingHistory";
import Customers from "./pages/customers/Customers";
import Menu from "./pages/admin/Menu";
import Staff from "./pages/admin/Staff";
import Reports from "./pages/admin/Reports";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/delivery" element={<Delivery />} />
        <Route path="/tables" element={<TablesPage />} />
        <Route path="/cashier" element={<Cashier />} />
        <Route path="/cashier/closing" element={<CashClosing />} />
        <Route path="/cashier/closing/history" element={<ClosingHistory />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/staff" element={<Staff />} />
        <Route path="/reports" element={<Reports />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
