import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import MapPage from "./pages/MapPage";
import ListPage from "./pages/ListPage";
import ReportPage from "./pages/ReportPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<MapPage />} />
        <Route path="liste" element={<ListPage />} />
        <Route path="melden" element={<ReportPage />} />
        <Route path="einstellungen" element={<SettingsPage />} />
        <Route
          path="*"
          element={<div className="text-center py-16 text-slate-500">Seite nicht gefunden.</div>}
        />
      </Route>
    </Routes>
  );
}
