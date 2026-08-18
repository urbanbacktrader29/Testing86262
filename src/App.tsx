import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Success from "./pages/Success";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="erfolg" element={<Success />} />
        <Route path="*" element={<div className="text-center py-16 text-slate-500">Seite nicht gefunden.</div>} />
      </Route>
    </Routes>
  );
}
